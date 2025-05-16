import { ValidationResultItem } from './validation-result';

export interface WorkflowContext {
    data: any;
    workflowId: string;
    workflowName: string;
    executionId: string;
    validationResults?: ValidationResultItem[];
    [key: string]: any;
} 