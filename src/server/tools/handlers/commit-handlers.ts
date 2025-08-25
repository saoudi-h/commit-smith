import { GitOperations } from "../../../git/operations.js";
import { CommitSchema } from "../schemas.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { AGENT_PRESETS } from "../../../config/agent-presets.js";
import { validationAdapterRegistry } from "../../../validation/registry.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { z } from "zod";

export class CommitToolHandlers {
  private gitOps: GitOperations;
  private server: Server;

  constructor(gitOps: GitOperations, server: Server) {
    this.gitOps = gitOps;
    this.server = server;
  }

  async handleCommit(args: any) {
    const validatedArgs = CommitSchema.parse(args);
    try {
      const shouldAutoStage = validatedArgs.auto_stage;
      const shouldAutoCommit = validatedArgs.auto_commit;

      // Check if we're in a git repository
      const isRepo = await this.gitOps.checkIsRepo();
      if (!isRepo) {
        throw new McpError(ErrorCode.InvalidParams, "Not in a git repository");
      }

      // Check for staged changes
      const hasStagedChanges = await this.gitOps.hasStagedChanges();

      // Check for unstaged files if auto-staging is enabled
      const unstagedFiles = shouldAutoStage
        ? await this.gitOps.getUnstagedFiles()
        : [];

      if (!hasStagedChanges && unstagedFiles.length === 0) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "No staged or unstaged changes found"
        );
      }

      // Handle unstaged files
      let filesStaged = 0;
      if (unstagedFiles.length > 0) {
        if (shouldAutoStage) {
          // Auto-stage all unstaged files
          await this.gitOps.stageFiles(unstagedFiles);
          filesStaged = unstagedFiles.length;
        } else {
          // Return confirmation request for unstaged files
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: false,
                    needs_confirmation: true,
                    message: `Found ${unstagedFiles.length} unstaged files. Please confirm if you want to stage them:`,
                    unstaged_files: unstagedFiles,
                    suggestion:
                      "You can call the commit tool again with auto_stage: true to automatically stage these files.",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }

      // Get the staged diff for AI to analyze and generate commit message
      const stagedDiff = await this.gitOps.getStagedDiff();

      // Determine the appropriate preset
      const selectedPreset = validatedArgs.style || "default";
      const presetConfig = AGENT_PRESETS[selectedPreset];

      // Use sampling to request AI to generate the commit message
      const commitMessage = await this.generateCommitMessageWithSampling(
        stagedDiff.content,
        validatedArgs.request,
        presetConfig
      );

      // Validate the generated message
      const validation = await this.validateCommitMessage(commitMessage);

      if (!validation.valid) {
        const adapter = validationAdapterRegistry.get("commitlint");
        const formattedErrors =
          adapter?.formatErrors?.(validation.errors) ??
          JSON.stringify(validation.errors, null, 2);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  generated_message: commitMessage,
                  validation_errors: validation.errors,
                  formatted_errors: formattedErrors,
                  suggestion:
                    "The generated commit message doesn't meet the validation requirements. Please try again with different parameters.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Prepare the commit message in .git/COMMIT_EDITMSG
      await this.gitOps.prepareCommitMessage(commitMessage);

      let commitResult = null;
      if (shouldAutoCommit) {
        // Perform the actual commit
        commitResult = await this.gitOps.commitWithMessage(
          commitMessage,
          false
        );

        if (!commitResult.success) {
          throw new McpError(
            ErrorCode.InternalError,
            commitResult.error || "Failed to commit"
          );
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: "Commit process completed successfully",
                commit_message: commitMessage,
                validation: {
                  valid: validation.valid,
                  warnings: validation.warnings,
                },
                files_staged: filesStaged,
                auto_committed: shouldAutoCommit,
                commit_sha: commitResult?.commitSha,
                next_step: shouldAutoCommit
                  ? "Commit completed successfully"
                  : "Please review the commit message in your editor and commit manually",
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Commit operation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Uses the sampling functionality to request AI to generate a commit message
   */
  private async generateCommitMessageWithSampling(
    diff: string,
    userRequest: string,
    presetConfig: any
  ): Promise<string> {
    try {
      // Construire le prompt pour l'IA
      const systemPrompt = this.buildSystemPrompt(presetConfig);

      // Construire le message utilisateur avec le diff et la demande
      const userMessage = this.buildUserMessage(
        diff,
        userRequest,
        presetConfig
      );

      // Définir le schéma pour la réponse du sampling
      const SamplingResponseSchema = z.object({
        role: z.string(),
        content: z.object({
          type: z.string(),
          text: z.string(),
        }),
        model: z.string().optional(),
        stopReason: z.string().optional(),
      });

      // Appeler la fonctionnalité de sampling
      const samplingRequest = {
        method: "sampling/createMessage",
        params: {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: userMessage,
              },
            },
          ],
          systemPrompt: systemPrompt,
          maxTokens: 200,
          temperature: 0.3,
          modelPreferences: {
            hints: [{ name: "claude-3-sonnet" }],
            intelligencePriority: 0.8,
            speedPriority: 0.5,
          },
        },
      };

      // Send the sampling request to the client with the response schema
      const response = await this.server.request(
        samplingRequest,
        SamplingResponseSchema
      );

      // Extract the generated message from the response
      if (response && response.content && response.content.text) {
        return response.content.text.trim();
      }

      throw new Error("Invalid response from sampling request");
    } catch (error) {
      throw new Error(
        `Failed to generate commit message using sampling: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Builds the system prompt based on the preset configuration
   */
  private buildSystemPrompt(presetConfig: any): string {
    const agent = presetConfig.agent;
    const rules = presetConfig.absolute_rules;
    const instructions = presetConfig.instructions_for_ai;

    return `You are ${agent.name}. ${agent.mission}.
    
${agent.founding_principle}

RULES:
- Language: ${rules.language.commit_messages}
- Format: ${rules.format.structure}
- Subject max length: ${rules.format.subject.max_length} characters
- Body format: ${rules.format.body.format || "Not required"}
- Body limit: ${rules.format.body.limit || "Not required"}

INSTRUCTIONS:
${instructions.behavior}
${instructions.golden_rule ? `- ${instructions.golden_rule}` : ""}
${instructions.verbosity_control ? `- ${instructions.verbosity_control.principle}` : ""}
${instructions.language_enforcement ? `- ${instructions.language_enforcement}` : ""}

OUTPUT REQUIREMENTS:
${presetConfig.output_format.requirements.join("\n- ")}`;
  }

  /**
   * Builds the user message with the diff and request
   */
  private buildUserMessage(
    diff: string,
    userRequest: string,
    presetConfig: any
  ): string {
    // Utiliser presetConfig pour personnaliser le message si nécessaire
    const styleHint = presetConfig.agent.name.includes("Minimal")
      ? "Keep it concise and brief."
      : presetConfig.agent.name.includes("Strict")
        ? "Follow the conventional commit format precisely."
        : presetConfig.agent.name.includes("Descriptive")
          ? "Provide context and details when appropriate."
          : "Follow standard conventional commit format.";

    return `User request: "${userRequest}"

Style guidance: ${styleHint}

Git diff:
\`\`\`
${diff}
\`\`\`

Please generate a commit message based on the above diff and user request, following the specified format and rules.`;
  }

  /**
   * Validates the commit message using the validation adapter
   */
  private async validateCommitMessage(message: string): Promise<any> {
    const adapter = validationAdapterRegistry.get("commitlint");
    if (!adapter) {
      return { valid: true, errors: [], warnings: [] };
    }

    return adapter.validate(message);
  }
}
