import { describe, it, expect, beforeEach, vi } from "vitest";
import { CommitSmithServer } from "../src/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Mock the base server to capture the request handler
vi.mock("@modelcontextprotocol/sdk/server/index.js");
vi.mock("../src/git/operations.js");
vi.mock("../src/validation/registry.js");
vi.mock("../src/config/config-manager.js");

describe("Integration Tests for Tool Calls", () => {
  let server: CommitSmithServer;
  let callToolHandler: any;

  beforeEach(async () => {
    const mockServer = {
      setRequestHandler: vi.fn(),
      connect: vi.fn(),
      close: vi.fn(),
      onerror: null,
    };
    (Server as any).mockImplementation(() => mockServer);

    // Mock validation adapter
    const mockValidationAdapter = {
      name: "commitlint",
      loadConfig: vi.fn(),
      validate: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
      formatErrors: vi.fn().mockReturnValue("")
    };

    // Mock git operations
    const { GitOperations } = await import("../src/git/operations.js");
    vi.mocked(GitOperations).mockImplementation(() => ({
      git: {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        diff: vi.fn().mockResolvedValue(""),
        status: vi.fn().mockResolvedValue({ staged: ["file1.txt", "file2.txt"], not_added: [], modified: [], created: [], deleted: [] }),
        add: vi.fn().mockResolvedValue(undefined),
        revparse: vi.fn().mockResolvedValue(".git"),
        commit: vi.fn().mockResolvedValue({ commit: "abc123" }),
      },
      checkIsRepo: vi.fn().mockResolvedValue(true),
      hasStagedChanges: vi.fn().mockResolvedValue(true),
      getUnstagedFiles: vi.fn().mockResolvedValue([]),
      getStagedFiles: vi.fn().mockResolvedValue(["file1.txt", "file2.txt"]),
      stageFiles: vi.fn().mockResolvedValue(undefined),
      getStagedDiff: vi.fn().mockResolvedValue({ content: "test diff" }),
      prepareCommitMessage: vi.fn().mockResolvedValue(undefined),
      commitWithMessage: vi.fn().mockResolvedValue({ success: true, commitSha: "abc123" }),
    } as any));

    // Mock config manager
    const { ConfigManager } = await import("../src/config/config-manager.js");
    vi.mocked(ConfigManager).mockImplementation(() => {
      const config = { agent: { preset: "default" }, behavior: { require_confirmation: true } };
      return {
        getConfig: vi.fn().mockReturnValue({ ...config }),
        updateConfig: vi.fn().mockReturnValue({ ...config }),
        getDefaultConfig: vi.fn().mockReturnValue({ agent: { preset: "default" }, behavior: { require_confirmation: true } }),
        getAgentPrompt: vi.fn().mockReturnValue({}),
      } as any;
    });

    // Mock validation adapter registry
    const { validationAdapterRegistry } = await import("../src/validation/registry.js");
    vi.mocked(validationAdapterRegistry.get).mockReturnValue(mockValidationAdapter);
    vi.mocked(validationAdapterRegistry.register).mockImplementation(() => {});

    // Re-import server after mocks are set up
    const { CommitSmithServer: ServerClass } = await import("../src/index.js");
    server = new ServerClass();
    await server.start();

    // Find the CallTool handler that was registered
    const callToolRegistration = mockServer.setRequestHandler.mock.calls.find(
      (call) => call[0] === CallToolRequestSchema
    );
    if (!callToolRegistration) {
      throw new Error("CallToolRequest handler not registered");
    }
    callToolHandler = callToolRegistration[1];
  });

  it("should handle commit and return diff data", async () => {
    const request = {
      params: {
        name: "commit",
        arguments: {
          request: "Generate a short commit message",
          auto_commit: false,
          auto_stage: true
        },
      },
    };

    const result = await callToolHandler(request);
    const response = JSON.parse(result.content[0].text);

    expect(response.success).toBe(true);
    expect(response.diff).toBeDefined();
    expect(response.files_staged).toBeDefined();
    expect(response.auto_commit).toBe(false);
    expect(response.next_step).toContain("generate a commit message");
  });

  it("should handle validate_and_commit with valid message", async () => {
    const request = {
      params: {
        name: "validate_and_commit",
        arguments: {
          message: "feat: add new feature",
          auto_commit: true
        },
      },
    };

    const result = await callToolHandler(request);
    const response = JSON.parse(result.content[0].text);

    expect(response.success).toBe(true);
    expect(response.message).toContain("validated and prepared successfully");
    expect(response.commit_message).toBe("feat: add new feature");
    expect(response.auto_committed).toBe(true);
    expect(response.commit_sha).toBeDefined();
  });

  it("should handle validate_and_commit with invalid message", async () => {
    // Test with a message that would likely fail validation
    const request = {
      params: {
        name: "validate_and_commit",
        arguments: {
          message: "invalid: message",
          auto_commit: false
        },
      },
    };

    const result = await callToolHandler(request);
    const response = JSON.parse(result.content[0].text);

    // The response should have validation information
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('validation');
  });
});