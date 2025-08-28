import { simpleGit, SimpleGit } from "simple-git";
import * as fs from "fs/promises";
import * as path from "path";

export interface DiffResult {
  content: string;
}

export interface CommitResult {
  success: boolean;
  commitSha?: string;
  message?: string;
  error?: string;
}

export interface SafetyCheckResult {
  isSafe: boolean;
  reason?: string;
  warnings: string[];
}

export class GitOperations {
  private git: SimpleGit;

  constructor() {
    this.git = simpleGit();
  }

  /**
   * Check if we're in a git repository
   */
  async checkIsRepo(): Promise<boolean> {
    try {
      return await this.git.checkIsRepo();
    } catch {
      return false;
    }
  }

  /**
   * Check if there are staged changes
   */
  async hasStagedChanges(): Promise<boolean> {
    try {
      const staged = await this.git.diff(["--cached", "--name-only"]);
      return staged.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get list of unstaged files
   */
  async getUnstagedFiles(): Promise<string[]> {
    try {
      // Use git.status() to get a comprehensive list of unstaged files
      const status = await this.git.status();
      return status.not_added
        .concat(status.modified)
        .concat(status.created)
        .concat(status.deleted)
        .filter(file => file.trim().length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Get the list of currently staged files
   */
  async getStagedFiles(): Promise<string[]> {
    try {
      const status = await this.git.status();
      return status.staged;
    } catch {
      return [];
    }
  }

  /**
   * Stage specific files
   */
  async stageFiles(files: string[]): Promise<void> {
    try {
      await this.git.add(files);
    } catch (error) {
      throw new Error(
        `Failed to stage files: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get the complete diff of staged changes without limitations
   */
  async getStagedDiff(): Promise<DiffResult> {
    try {
      // Check if we're in a git repository
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        throw new Error("Not in a git repository");
      }

      // Get the complete raw diff without any limitations
      const diffContent = await this.git.diff(["--cached", "--no-prefix"]);

      if (!diffContent) {
        throw new Error(
          "No staged changes found. Please stage your changes first with `git add`.",
        );
      }

      return {
        content: diffContent,
      };
    } catch (error) {
      throw new Error(
        `Failed to get staged diff: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Prepare commit message in .git/COMMIT_EDITMSG
   */
  async prepareCommitMessage(message: string): Promise<void> {
    try {
      const gitDir = await this.git.revparse(["--git-dir"]);
      const commitMsgPath = path.join(gitDir, "COMMIT_EDITMSG");
      await fs.writeFile(commitMsgPath, message, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to prepare commit message: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Commit with the provided message (simplified - always proceeds)
   */
  async commitWithMessage(
    message: string,
    dryRun: boolean = false,
  ): Promise<CommitResult> {
    try {
      if (dryRun) {
        return {
          success: true,
          message: "Dry run: commit message is valid",
        };
      }

      // Perform the actual commit (no validation needed)
      const result = await this.git.commit(message);

      return {
        success: true,
        commitSha: result.commit,
        message: `Committed successfully: ${result.commit}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to commit: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
}
