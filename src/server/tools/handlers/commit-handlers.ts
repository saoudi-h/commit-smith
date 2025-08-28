import { GitOperations } from "../../../git/operations.js";
import { CommitSchema } from "../schemas.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { AGENT_PRESETS } from "../../../config/agent-presets.js";

export class CommitToolHandlers {
  private gitOps: GitOperations;

  constructor(gitOps: GitOperations) {
    this.gitOps = gitOps;
  }

  async handleCommit(args: any) {
    const validatedArgs = CommitSchema.parse(args);

    try {
      let stagedFiles = [];
      const shouldAutoStage = validatedArgs.auto_stage;
      const shouldAutoCommit = validatedArgs.auto_commit;

      // Check if we're in a git repository
      const isRepo = await this.gitOps.checkIsRepo();
      if (!isRepo) {
        throw new McpError(ErrorCode.InvalidParams, "Not in a git repository");
      }

      // Check for staged changes
      const hasStagedChanges = await this.gitOps.hasStagedChanges();
      console.log("Has staged changes:", hasStagedChanges);
      
      // Check for unstaged files if auto-staging is enabled
      
      if(!hasStagedChanges && !shouldAutoStage) {
        throw new McpError(ErrorCode.InvalidParams, `No staged changes found. Please stage your changes first with git add or turn
        on auto staging with auto_stage: true.`);
      }

      if(!hasStagedChanges && shouldAutoStage) {  
        const unstagedFiles = shouldAutoStage ? await this.gitOps.getUnstagedFiles() : [];
        if(unstagedFiles.length === 0) {
          throw new McpError(ErrorCode.InvalidParams, `No changes found.`)
        }
        // Handle unstaged files
       
        
          // Auto-stage all unstaged files
          await this.gitOps.stageFiles(unstagedFiles);
          stagedFiles = unstagedFiles;
        
        
      } else {
        // Get the list of currently staged files
        stagedFiles = await this.gitOps.getStagedFiles();
      }




      // Get the staged diff for AI to analyze and generate commit message
      const stagedDiff = await this.gitOps.getStagedDiff();
      
      
      // Determine the appropriate preset
      const selectedPreset = validatedArgs.style || 'default';
      const presetConfig = AGENT_PRESETS[selectedPreset];
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                diff: stagedDiff.content,
                user_request: validatedArgs.request,
                selected_preset: selectedPreset,
                preset_config: presetConfig,
                files_staged: stagedFiles.length,
                auto_commit: shouldAutoCommit,
                next_step: "Please generate a commit message based on the diff and user request using preset_config. Call validate_and_commit with generated message and auto_commit setting.",
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
        `Commit operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

}
