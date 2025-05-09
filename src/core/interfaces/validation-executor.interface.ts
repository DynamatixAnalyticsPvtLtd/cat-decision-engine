import { ValidationRule, ValidationResult, WorkflowContext } from '../types';

export interface IValidationExecutor {
    executeValidation(rule: ValidationRule, context: WorkflowContext): Promise<ValidationResult>;
} 