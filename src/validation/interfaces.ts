export interface ValidationAdapter {
  name: string;
  
  // Step 1: Check if the adapter can be used in the current environment
  loadConfig(): Promise<ConfigSnapshot>;
  
  // Step 4: Validate a commit message
  validate(message: string): Promise<ValidationResult>;
  
  // Optional: Format errors for display
  formatErrors?(errors: ValidationError[]): string;
}

export interface ConfigSnapshot {
  rules: Record<string, any>;
  extends?: string[];
  helpUrl?: string;
  // ... other configuration fields
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationError {
  rule: string;
  message: string;
  line?: number;
  column?: number;
}
