import {
  ValidationAdapter,
  ConfigSnapshot,
  ValidationResult,
  ValidationError,
} from '../interfaces.js';
import type { QualifiedConfig } from '@commitlint/types';

export class CommitlintAdapter implements ValidationAdapter {
  public readonly name = 'commitlint';
  private config: QualifiedConfig | null = null;

  async loadConfig(): Promise<ConfigSnapshot> {
    const { load } = await import('@commitlint/core');
    const loadedConfig = await load({});

    if (!this.isQualifiedConfig(loadedConfig)) {
        throw new Error('Failed to load a valid commitlint configuration.');
    }
    
    this.config = loadedConfig;
    

    return {
      rules: this.config.rules,
      extends: this.config.extends,
      helpUrl: this.config.helpUrl,
    };
  }

  private isQualifiedConfig(config: unknown): config is QualifiedConfig {
    return typeof config === 'object' && config !== null && 'rules' in config;
  }

  async validate(message: string): Promise<ValidationResult> {
    const { lint } = await import('@commitlint/core');
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    
    const report = await lint(message, this.config.rules);
    
    return {
      valid: report.valid,
      errors: report.errors.map(e => ({
        rule: e.name,
        message: e.message,
      })),
      warnings: report.warnings.map(w => ({
        rule: w.name,
        message: w.message
      }))
    };
  }

  formatErrors(errors: ValidationError[]): string {
    // TODO: Implement error formatting using @commitlint/format
    return errors.map(error => `${error.rule}: ${error.message}`).join('\n');
  }
}