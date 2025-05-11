export interface WorkflowContext {
    data: any;
    workflowId?: string;
    workflowName?: string;
    executionId?: string;
    [key: string]: any;
} 