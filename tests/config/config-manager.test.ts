import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigManager } from "../../src/config/config-manager.js";
import { AGENT_PRESETS } from "../../src/config/agent-presets.js";

describe("ConfigManager", () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    vi.clearAllMocks();
    configManager = new ConfigManager();
  });

  describe("constructor", () => {
    it("should initialize with default configuration", () => {
      const config = configManager.getConfig();
      expect(config.agent.preset).toBe("default");
      expect(config.behavior.require_confirmation).toBe(true);
    });
  });

  describe("updateConfig", () => {
    it("should merge config updates correctly", () => {
      const updates = {
        agent: { preset: "minimal" as const },
        behavior: {
          require_confirmation: false,
        },
      };
      const result = configManager.updateConfig(updates);
      expect(result.agent.preset).toBe("minimal");
      expect(result.behavior.require_confirmation).toBe(false);
    });

    it("should preserve existing config when updating partially", () => {
      configManager.updateConfig({
        agent: { preset: "strict" as const },
      });
      
      const result = configManager.updateConfig({
        behavior: { require_confirmation: false },
      });
      
      expect(result.agent.preset).toBe("strict");
      expect(result.behavior.require_confirmation).toBe(false);
    });
  });

  describe("getAgentPrompt", () => {
    it("should return default preset prompt by default", () => {
      const prompt = configManager.getAgentPrompt();
      expect(prompt.agent.name).toBe("CommitSmith");
      expect(prompt.agent.mission).toContain("Conventional Commit");
    });

    it("should return custom prompt when provided", () => {
      const customPrompt = { custom: "prompt", test: true };
      configManager.updateConfig({
        agent: {
          preset: "default",
          custom_prompt: JSON.stringify(customPrompt),
        },
      });
      const prompt = configManager.getAgentPrompt();
      expect(prompt).toEqual(customPrompt);
    });

    it("should fallback to preset on invalid custom prompt", () => {
      configManager.updateConfig({
        agent: {
          preset: "default",
          custom_prompt: "invalid json",
        },
      });
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const prompt = configManager.getAgentPrompt();
      // Should fallback to default preset
      expect(prompt.agent.name).toBe("CommitSmith");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to parse custom prompt"),
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("should handle different presets", () => {
      configManager.updateConfig({
        agent: { preset: "minimal" },
      });
      const prompt = configManager.getAgentPrompt();
      expect(prompt.agent.name).toBe("CommitSmith-Minimal");
    });
  });
});
