import { z } from "zod";
import { AGENT_PRESETS } from "./agent-presets.js";

const CommitSmithConfigSchema = z.object({
  agent: z
    .object({
      custom_prompt: z.string().optional(),
      preset: z
        .enum(["default", "strict", "minimal", "descriptive"])
        .default("default"),
    })
    .default({}),

  behavior: z
    .object({
      require_confirmation: z.boolean().default(true),
    })
    .default({}),
});

export type CommitSmithConfig = z.infer<typeof CommitSmithConfigSchema>;

export class ConfigManager {
  private config: CommitSmithConfig;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  /**
   * Get current configuration
   */
  getConfig(): CommitSmithConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CommitSmithConfig>): CommitSmithConfig {
    this.config = CommitSmithConfigSchema.parse({
      ...this.config,
      ...updates,
      agent: { ...this.config.agent, ...updates.agent },
      behavior: { ...this.config.behavior, ...updates.behavior },
    });
    return this.config;
  }

  /**
   * Get agent prompt based on current configuration
   */
  getAgentPrompt(): any {
    if (this.config.agent.custom_prompt) {
      try {
        return JSON.parse(this.config.agent.custom_prompt);
      } catch (error) {
        console.warn(
          "Failed to parse custom prompt, falling back to preset:",
          error,
        );
      }
    }
    const preset =
      AGENT_PRESETS[this.config.agent.preset] || AGENT_PRESETS.default;
    // Return the preset directly without format overrides
    return JSON.parse(JSON.stringify(preset));
  }

  private getDefaultConfig(): CommitSmithConfig {
    return CommitSmithConfigSchema.parse({});
  }
}
