import { GitOperations } from "../../../git/operations.js";
import { ValidateAndCommitSchema } from "../schemas.js";
import { validationAdapterRegistry } from "../../../validation/registry.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type { ValidationResult } from "../../../validation/interfaces.js";

export class ValidateAndCommitToolHandlers {
  private gitOps: GitOperations;

  constructor(gitOps: GitOperations) {
    this.gitOps = gitOps;
  }

  async handleValidateAndCommit(args: any) {
    const validatedArgs = ValidateAndCommitSchema.parse(args);

    try {
      // Check if we're in a git repository
      const isRepo = await this.gitOps.checkIsRepo();
      if (!isRepo) {
        throw new McpError(ErrorCode.InvalidParams, "Not in a git repository");
      }

      // Validate the commit message
      const validation = await this.validateCommitMessage(validatedArgs.message);
      
      if (!validation.valid) {
        const adapter = validationAdapterRegistry.get('commitlint');
        const formattedErrors = adapter?.formatErrors?.(validation.errors) ?? JSON.stringify(validation.errors, null, 2);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  validation_errors: validation.errors,
                  formatted_errors: formattedErrors,
                  suggestion: "The commit message doesn't meet the validation requirements. Please fix the message and try again.",
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Prepare the commit message in .git/COMMIT_EDITMSG
      await this.gitOps.prepareCommitMessage(validatedArgs.message);

      let commitResult = null;
      if (validatedArgs.auto_commit) {
        // Perform the actual commit
        commitResult = await this.gitOps.commitWithMessage(validatedArgs.message, false);
        
        if (!commitResult.success) {
          throw new McpError(ErrorCode.InternalError, commitResult.error || "Failed to commit");
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: "Commit message validated and prepared successfully",
                commit_message: validatedArgs.message,
                validation: {
                  valid: validation.valid,
                  warnings: validation.warnings,
                },
                auto_committed: validatedArgs.auto_commit,
                commit_sha: commitResult?.commitSha,
                next_step: validatedArgs.auto_commit 
                  ? "Commit completed successfully" 
                  : "Please review the commit message in your editor and commit manually",
              },
              null,
              2,
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
        `Validate and commit operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async validateCommitMessage(message: string): Promise<ValidationResult> {
    const adapter = validationAdapterRegistry.get('commitlint');
    if (!adapter) {
      return { valid: true, errors: [], warnings: [] };
    }
    
    return adapter.validate(message);
  }
}