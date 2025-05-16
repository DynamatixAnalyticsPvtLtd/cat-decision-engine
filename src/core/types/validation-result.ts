import { ValidationRule } from './validation-rule';

export interface ValidationResultItem {
    rule: ValidationRule;
    success: boolean;
    message?: string;
}

export interface ValidationResult {
    success: boolean;
    validationResults: ValidationResultItem[];
    shouldStop: boolean;  // Indicates if workflow should stop after validation
} 