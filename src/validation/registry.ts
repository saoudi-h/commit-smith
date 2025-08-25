import { ValidationAdapter } from './interfaces.js';

export class ValidationAdapterRegistry {
  private adapters = new Map<string, ValidationAdapter>();

  register(adapter: ValidationAdapter): void {
    if (this.adapters.has(adapter.name)) {
      console.warn(`Adapter with name "${adapter.name}" is already registered. Overwriting.`);
    }
    this.adapters.set(adapter.name, adapter);
  }

  get(name: string): ValidationAdapter | undefined {
    return this.adapters.get(name);
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// Export a singleton instance
export const validationAdapterRegistry = new ValidationAdapterRegistry();
