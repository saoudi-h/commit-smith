import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ValidationAdapterRegistry } from "../../src/validation/registry.js";
import { CommitlintAdapter } from "../../src/validation/adapters/commitlint.adapter.js";
import { ValidationAdapter, ValidationResult } from "../../src/validation/interfaces.js";

// Mock the commitlint dependencies
vi.mock('@commitlint/core', () => ({
  load: vi.fn(),
  lint: vi.fn(),
}));

describe("Validation System", () => {
  let registry: ValidationAdapterRegistry;
  let commitlintAdapter: CommitlintAdapter;

  beforeEach(() => {
    registry = new ValidationAdapterRegistry();
    commitlintAdapter = new CommitlintAdapter();
    vi.clearAllMocks(); // Clear mocks before each test
  });

  describe("ValidationAdapterRegistry", () => {
    it("should register and retrieve an adapter", () => {
      registry.register(commitlintAdapter);
      const adapter = registry.get("commitlint");
      expect(adapter).toBe(commitlintAdapter);
      expect(adapter?.name).toBe("commitlint");
    });

    it("should list registered adapters", () => {
      registry.register(commitlintAdapter);
      expect(registry.list()).toEqual(["commitlint"]);
    });

    it("should overwrite an existing adapter with the same name", () => {
      const adapter1 = new CommitlintAdapter();
      const adapter2 = new CommitlintAdapter(); // A different instance
      
      registry.register(adapter1);
      registry.register(adapter2);

      expect(registry.get("commitlint")).toBe(adapter2);
      expect(registry.list().length).toBe(1);
    });

    it("should return undefined for a non-existent adapter", () => {
      expect(registry.get("non-existent-adapter")).toBeUndefined();
    });
  });

  describe("CommitlintAdapter", () => {
    let loadSpy: any;
    let lintSpy: any;

    beforeEach(async () => {
      // Reset mocks before each test
      loadSpy = vi.spyOn(await import('@commitlint/core'), 'load').mockClear();
      lintSpy = vi.spyOn(await import('@commitlint/core'), 'lint').mockClear();
    });

    it('should load configuration and transform it', async () => {
      const mockConfig = {
        rules: { 'header-max-length': [2, 'always', 72] },
        extends: ['@commitlint/config-conventional'],
        helpUrl: 'http://example.com',
        parserPreset: { parserOpts: { headerPattern: /^(.*)$/ } },
      };
      loadSpy.mockResolvedValue({
        rules: { 'header-max-length': [2, 'always', 72] as const },
        extends: mockConfig.extends,
        helpUrl: mockConfig.helpUrl,
        formatter: 'function',
        plugins: {},
        prompt: {}
      } as any);

      const snapshot = await commitlintAdapter.loadConfig();

      expect(loadSpy).toHaveBeenCalled();
      expect(snapshot.rules).toEqual(mockConfig.rules);
      expect(snapshot.extends).toEqual(mockConfig.extends);
      expect(snapshot.helpUrl).toBe(mockConfig.helpUrl);
    });

    it('should validate a message correctly', async () => {
      const mockReport = {
        valid: true,
        errors: [],
        warnings: [],
      };
      lintSpy.mockResolvedValue({
        valid: mockReport.valid,
        errors: mockReport.errors,
        warnings: mockReport.warnings,
        input: ''
      } as any);

      // Ensure config is loaded before validation
      await commitlintAdapter.loadConfig();
      const result = await commitlintAdapter.validate('feat: a new feature');

      expect(lintSpy).toHaveBeenCalledWith('feat: a new feature', expect.any(Object));
      expect(result.valid).toBe(true);
    });

    it('should format errors', () => {
      const errors = [{ rule: 'test-rule', message: 'test error' }];
      const result = commitlintAdapter.formatErrors(errors);
      expect(result).toBe('test-rule: test error');
    });

    it('should throw an error for invalid config from load', async () => {
      loadSpy.mockResolvedValue(null as any); // Invalid config that should throw
      await expect(commitlintAdapter.loadConfig()).rejects.toThrow('Failed to load a valid commitlint configuration.');
    });
  });
});
