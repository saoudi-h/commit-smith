import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { ConfigManager } from "../../config/config-manager.js";
import { AGENT_PRESETS } from "../../config/agent-presets.js";

export class ResourceHandlers {
  private server: Server;
  private configManager: ConfigManager;

  constructor(server: Server, configManager: ConfigManager) {
    this.server = server;
    this.configManager = configManager;
    this.setupResourceHandlers();
  }

  private setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "commit://agent-definition",
          name: "CommitSmith Agent Definition",
          description:
            "The complete prompt defining how the AI should behave as CommitSmith",
          mimeType: "application/json",
        },
        {
          uri: "commit://presets",
          name: "Available Agent Presets",
          description: "List of available agent behavior presets",
          mimeType: "application/json",
        },
        {
          uri: "commit://ai-guide",
          name: "AI Processing Guide",
          description: "Instructions for processing user requests and selecting appropriate presets",
          mimeType: "application/json",
        },
      ],
    }));

// Handle resource reads
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const { uri } = request.params;

        try {
          switch (uri) {
            case "commit://agent-definition":
              return {
                contents: [
                  {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(
                      this.configManager.getAgentPrompt(),
                      null,
                      2,
                    ),
                  },
                ],
              };

            case "commit://presets":
              return {
                contents: [
                  {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(
                      {
                        available_presets: Object.keys(AGENT_PRESETS),
                        presets: AGENT_PRESETS,
                      },
                      null,
                      2,
                    ),
                  },
                ],
              };

            case "commit://ai-guide":
              return {
                contents: [
                  {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(
                      this.generateAIGuide(),
                      null,
                      2,
                    ),
                  },
                ],
              };

            default:
              throw new McpError(
                ErrorCode.InvalidRequest,
                `Unknown resource: ${uri}`,
              );
          }
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to read resource: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
    );
  }

  private generateAIGuide() {
    return {
      instructions: "Use this guide to process user requests and generate appropriate commit messages",
      
      preset_selection_rules: {
        description: "How to choose the right preset based on user request",
        rules: [
          {
            preset: "minimal",
            triggers: ["short", "brief", "minimal", "quick", "simple", "one line"],
            description: "Single line commits without body"
          },
          {
            preset: "strict", 
            triggers: ["strict", "professional", "enterprise", "perfect", "rigorous", "audit"],
            description: "Enterprise-grade commits with mandatory body and strict validation"
          },
          {
            preset: "descriptive",
            triggers: ["detailed", "descriptive", "verbose", "explain", "context", "why"],
            description: "Detailed commits with context and explanations"
          },
          {
            preset: "default",
            triggers: ["standard", "normal", "conventional", "regular"],
            description: "Standard conventional commits (fallback if no specific style detected)"
          }
        ],
        fallback: "default"
      },

      processing_workflow: {
        step_1: "Read the user_request from commit tool output",
        step_2: "Analyze request against preset_selection_rules to identify best preset",
        step_3: "Load the selected preset configuration from commit://presets resource", 
        step_4: "Apply preset rules to generate commit message from diff",
        step_5: "CRITICAL: Always generate commit messages in English regardless of user's language",
        step_6: "Call validate_and_commit with generated message and appropriate auto_commit setting"
      },

      validation_rules: {
        preset_validation: "If detected preset doesn't exist in available_presets, fallback to 'default'",
        language_enforcement: "ALL commit messages MUST be in English",
        format_validation: "Follow the structure defined in selected preset's absolute_rules.format"
      },

      examples: {
        user_says_minimal: {
          input: "Generate a brief commit message",
          selected_preset: "minimal",
          reasoning: "Keywords 'brief' matches minimal preset triggers"
        },
        user_says_detailed: {
          input: "I need a detailed commit with context explaining why", 
          selected_preset: "descriptive",
          reasoning: "Keywords 'detailed', 'context', 'why' match descriptive preset triggers"
        },
        user_says_standard: {
          input: "Generate a commit message",
          selected_preset: "default", 
          reasoning: "No specific style keywords, use default fallback"
        }
      }
    };
  }
}