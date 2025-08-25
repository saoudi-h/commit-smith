import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { GitOperations } from "./git/operations.js";
import { ConfigManager } from "./config/config-manager.js";
import { CommitToolHandlers } from "./server/tools/handlers/commit-handlers.js";
import { ValidateAndCommitToolHandlers } from "./server/tools/handlers/validate-and-commit-handlers.js";
import { ResourceHandlers } from "./server/resources/handlers.js";
import { setupErrorHandling } from "./server/utils/error-handling.js";
import { validationAdapterRegistry } from "./validation/registry.js";
import { CommitlintAdapter } from "./validation/adapters/commitlint.adapter.js";

class CommitSmithServer {
  private server: Server;
  private gitOps: GitOperations;
  private configManager: ConfigManager;
  private commitToolHandlers: CommitToolHandlers;
  private validateAndCommitToolHandlers: ValidateAndCommitToolHandlers;

  constructor() {
    this.gitOps = new GitOperations();
    this.configManager = new ConfigManager();
    this.commitToolHandlers = new CommitToolHandlers(this.gitOps);
    this.validateAndCommitToolHandlers = new ValidateAndCommitToolHandlers(this.gitOps);

    this.server = new Server(
      {
        name: "commit-smith",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    new ResourceHandlers(this.server, this.configManager);

    // Register validation adapters
    validationAdapterRegistry.register(new CommitlintAdapter());

    this.setupToolHandlers();
    setupErrorHandling(this.server);
  }

  private setupToolHandlers() {
    // List available tools
this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
{
  name: "commit",
  description: `ANALYZE GIT CHANGES AND RETURN COMMIT DATA WITH AGENT DEFINITION FOR MESSAGE GENERATION.
  
  CRITICAL RULES FOR AI:
  1. ALWAYS set auto_commit: true unless user explicitly says otherwise
  2. NEVER interpret user intent - follow exact wording
  3. Style detection is based ONLY on keywords in user's request expressed in natural language
  
  AUTO_COMMIT RULES:
  - DEFAULT: true (commit automatically)
  - FALSE ONLY when user explicitly says: "don't commit", "no commit", "just generate", "show me first", "without committing"
  - For ALL other requests: true
  
  STYLE INTERPRETATION (semantic understanding):
  - Minimal: quick, brief, short, simple, "just the basics", "one-liner"
  - Descriptive: detailed, explain, context, "tell me more", thorough  
  - Strict: professional, formal, corporate, "proper format", rigorous
  - Default: when intent is unclear
  
  EXAMPLES:
  - "generate commit" → default style, auto_commit: true
  - "quick commit" → minimal style, auto_commit: true
  - "generate without committing" → any style, auto_commit: false
  - "show me a detailed message" → descriptive style, auto_commit: true
  - "create professional commit" → strict style, auto_commit: true`,
  
  inputSchema: {
    type: "object",
    properties: {
      request: {
        type: "string",
        description: "User's exact words. Do not interpret - use keyword matching only.",
      },
      style: {
        type: "string", 
        enum: ["default", "minimal", "descriptive", "strict"],
        description: "Style based on interpreted user intent, Default if no keywords.",
        default: "default"
      },
      auto_commit: {
        type: "boolean",
        default: true,
        description: "MUST be true unless user explicitly says 'don't commit' or similar",
      },
      auto_stage: {
        type: "boolean", 
        default: true,
        description: "Always true unless user explicitly mentions staging concerns",
      },
    },
    required: ["request"],
  },
},
    {
      name: "validate_and_commit",
      description: `Validate a commit message using commitlint and optionally perform the commit.
      
      This tool should be called after receiving diff data from the 'commit' tool.
      The commit message should ALWAYS be in English regardless of user's language.`,
      
      inputSchema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The commit message to validate and commit (must be in English)",
          },
          auto_commit: {
            type: "boolean",
            default: true,
            description: `Whether to automatically perform the commit after validation (default: true).
            - true (default): Commit immediately after successful validation
            - false: Only validate and prepare commit message for manual commit (override default)`,
          },
        },
        required: ["message"],
      },
    },
  ],
}));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "commit":
            return await this.commitToolHandlers.handleCommit(args);
          case "validate_and_commit":
            return await this.validateAndCommitToolHandlers.handleValidateAndCommit(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`,
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        if (error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
          );
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    });
  }

  async start() {
    try {
      // Initialize configuration - no longer need to load from file
      // Configuration is now in-memory only with defaults

      // Pre-load the default adapter config for faster first use
      const defaultAdapter = validationAdapterRegistry.get('commitlint');
      if (defaultAdapter && typeof defaultAdapter.loadConfig === 'function') {
        await defaultAdapter.loadConfig();
        console.error("Default validation adapter config loaded.");
      }

      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("CommitSmith MCP server started successfully");
    } catch (error) {
      console.error("Failed to start CommitSmith server:", error);
      process.exit(1);
    }
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new CommitSmithServer();
  server.start().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

export { CommitSmithServer };
