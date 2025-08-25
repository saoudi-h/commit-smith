import { describe, it, expect, beforeEach, vi } from "vitest";
import { GitOperations } from "../../src/git/operations.js";
import { simpleGit } from "simple-git";

// Mock simple-git
vi.mock("simple-git");
const mockSimpleGit = simpleGit as any;

// Mock fs/promises
vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe("GitOperations", () => {
  let gitOps: GitOperations;
  let mockGit: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGit = {
      checkIsRepo: vi.fn(),
      diff: vi.fn(),
      commit: vi.fn(),
      revparse: vi.fn(),
    };
    mockSimpleGit.mockReturnValue(mockGit);

    gitOps = new GitOperations();
  });

  describe("getStagedDiff", () => {
    it("should throw error when not in git repository", async () => {
      mockGit.checkIsRepo.mockResolvedValue(false);

      await expect(gitOps.getStagedDiff()).rejects.toThrow(
        "Not in a git repository",
      );
    });

    it("should throw error when no staged changes exist", async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);
      mockGit.diff.mockResolvedValue("");

      await expect(gitOps.getStagedDiff()).rejects.toThrow(
        "No staged changes found",
      );
    });

    it("should return complete diff content", async () => {
      const mockDiff = `diff --git a/src/main.ts b/src/main.ts
new file mode 100644
index 0000000..e69de29
--- /dev/null
+++ b/src/main.ts
@@ -0,0 +1,3 @@
+export function main() {
+  return 'hello';
+}`;

      mockGit.checkIsRepo.mockResolvedValue(true);
      mockGit.diff.mockResolvedValue(mockDiff);

      const result = await gitOps.getStagedDiff();

      expect(result.content).toBe(mockDiff);
      expect(result).toEqual({ content: mockDiff });
    });
  });

  describe("commitWithMessage", () => {
    it("should successfully commit with valid message", async () => {
      const message = "feat: valid commit message";
      mockGit.commit.mockResolvedValue({ commit: "abc123" });

      const result = await gitOps.commitWithMessage(message, false);

      expect(result.success).toBe(true);
      expect(result.commitSha).toBe("abc123");
      expect(mockGit.commit).toHaveBeenCalledWith(message);
    });

    it("should handle dry run without committing", async () => {
      const message = "feat: valid commit message";

      const result = await gitOps.commitWithMessage(message, true);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Dry run");
      expect(mockGit.commit).not.toHaveBeenCalled();
    });

    it("should succeed with any message after simplified validation", async () => {
      const message = ""; // Would have been invalid before
      mockGit.commit.mockResolvedValue({ commit: "abc123" });

      const result = await gitOps.commitWithMessage(message, false);

      expect(result.success).toBe(true);
      expect(result.commitSha).toBe("abc123");
      expect(mockGit.commit).toHaveBeenCalledWith(message);
    });

    it("should handle commit failure", async () => {
      const message = "feat: valid message";
      mockGit.commit.mockRejectedValue(new Error("Git error"));

      const result = await gitOps.commitWithMessage(message, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to commit");
    });
  });

  describe("prepareCommitMessage", () => {
    it("should write message to COMMIT_EDITMSG", async () => {
      const message = "feat: test message";
      mockGit.revparse.mockResolvedValue("/path/to/.git");

      const fs = await import("fs/promises");
      const writeFileSpy = vi.spyOn(fs, "writeFile");

      await gitOps.prepareCommitMessage(message);

      expect(writeFileSpy).toHaveBeenCalledWith(
        "/path/to/.git/COMMIT_EDITMSG",
        message,
        "utf8",
      );
    });

    it("should handle file write failure", async () => {
      const message = "feat: test message";
      mockGit.revparse.mockRejectedValue(new Error("Not a git repo"));

      await expect(gitOps.prepareCommitMessage(message)).rejects.toThrow(
        "Failed to prepare commit message",
      );
    });
  });


});
