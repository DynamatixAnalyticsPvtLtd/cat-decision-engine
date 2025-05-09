import { ValidationRule } from './validation-rule';

export interface ValidationResult {
    rule: ValidationRule;
    success: boolean;
    error?: string;
} 