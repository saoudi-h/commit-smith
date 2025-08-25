import { describe, it, expect, beforeEach, vi } from "vitest";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CommitSmithServer } from "../../src/index.js";
import {
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Mock dependencies
vi.mock("@modelcontextprotocol/sdk/server/index.js");
vi.mock("@modelcontextprotocol/sdk/server/stdio.js");
vi.mock("../../src/git/operations.js");
vi.mock("../../src/config/config-manager.js");
vi.mock("../../src/validation/registry.js", () => ({
  validationAdapterRegistry: {
    register: vi.fn(),
    get: vi.fn(),
    list: vi.fn(() => ["commitlint"]),
  },
}));
vi.mock("../../src/validation/adapters/commitlint.adapter.js", () => ({
  CommitlintAdapter: vi.fn().mockImplementation(() => ({
    loadConfig: vi.fn().mockResolvedValue({ rules: {} }),
    validate: vi.fn(),
    formatErrors: vi.fn(),
  })),
}));

describe("CommitSmithServer", () => {
  let server: CommitSmithServer;
  let mockServer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {
      setRequestHandler: vi.fn(),
      connect: vi.fn(),
      close: vi.fn(),
      onerror: null,
    };
    (Server as any).mockImplementation(() => mockServer);
    server = new CommitSmithServer();
  });

  describe("initialization", () => {
    it("should create server with correct capabilities", () => {
      expect(Server).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "commit-smith",
          version: "0.1.0",
        }),
        expect.objectContaining({
          capabilities: {
            tools: {},
            resources: {},
            sampling: {},
          },
        })
      );
    });

    it("should setup request handlers", () => {
      // Should have handlers for: ListTools, CallTool, ListResources, ReadResource
      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(4);
    });
  });

  describe("tool handlers", () => {
    it("should register only commit tool", async () => {
      // Get the ListTools handler
      const listToolsRegistration =
        mockServer.setRequestHandler.mock.calls.find(
          (call) => call[0] === ListToolsRequestSchema
        );

      if (!listToolsRegistration) {
        throw new Error("ListToolsRequest handler not registered");
      }

      const listToolsHandler = listToolsRegistration[1];
      const toolsResponse = await listToolsHandler();

      // Should only have the commit tool
      expect(toolsResponse.tools).toHaveLength(1);
      expect(toolsResponse.tools[0].name).toBe("commit");
      expect(toolsResponse.tools[0].description).toContain(
        "ANALYZE GIT CHANGES AND GENERATE COMMIT MESSAGE USING AI"
      );
    });
  });

  describe("resource handlers", () => {
    it("should register all expected resources", async () => {
      // Get the ListResources handler
      const listResourcesRegistration =
        mockServer.setRequestHandler.mock.calls.find(
          (call) => call[0] === ListResourcesRequestSchema
        );

      if (!listResourcesRegistration) {
        throw new Error("ListResourcesRequest handler not registered");
      }

      const listResourcesHandler = listResourcesRegistration[1];
      const resourcesResponse = await listResourcesHandler();

      // Should have all expected resources
      expect(resourcesResponse.resources).toHaveLength(3);
      expect(resourcesResponse.resources.map((r) => r.uri)).toContain(
        "commit://agent-definition"
      );
      expect(resourcesResponse.resources.map((r) => r.uri)).toContain(
        "commit://presets"
      );
      expect(resourcesResponse.resources.map((r) => r.uri)).toContain(
        "commit://ai-guide"
      );
    });
  });

  describe("error handling", () => {
    it("should setup error handlers", () => {
      expect(typeof mockServer.onerror).toBe("function");
    });

    it("should setup process error handlers", () => {
      // Just check that listeners exist, not the exact count
      expect(process.listenerCount("SIGINT")).toBeGreaterThan(0);
    });
  });

  describe("start", () => {
    it("should start server successfully", async () => {
      mockServer.connect.mockResolvedValue(undefined);
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await server.start();

      expect(mockServer.connect).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "CommitSmith MCP server started successfully"
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle start failures", async () => {
      mockServer.connect.mockRejectedValue(new Error("Connection failed"));
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const processExitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      await server.start();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to start CommitSmith server:",
        expect.any(Error)
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });
});
