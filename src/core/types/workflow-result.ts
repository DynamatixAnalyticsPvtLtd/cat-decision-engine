import { WorkflowContext } from './workflow-context';
import { ValidationResult } from './validation-result';
import { TaskResult } from './task-result';

export interface WorkflowResult {
    success: boolean;
    context: WorkflowContext;
    validationResults: ValidationResult[];
    taskResults: TaskResult[];
    error?: string;
} 