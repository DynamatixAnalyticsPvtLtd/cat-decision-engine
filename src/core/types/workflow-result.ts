import { WorkflowContext } from './workflow-context';
import { ValidationResultItem } from './validation-result';
import { TaskResult } from './task-result';

export interface WorkflowResult {
    success: boolean;
    context: WorkflowContext;
    validationResults: ValidationResultItem[];
    taskResults: TaskResult[];
    error?: string;
} 