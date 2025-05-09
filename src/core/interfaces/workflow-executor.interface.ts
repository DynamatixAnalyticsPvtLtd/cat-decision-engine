import { Workflow, WorkflowContext, WorkflowResult } from '../types';

export interface IWorkflowExecutor {
    executeWorkflow(workflow: Workflow, context: WorkflowContext): Promise<WorkflowResult>;
} 