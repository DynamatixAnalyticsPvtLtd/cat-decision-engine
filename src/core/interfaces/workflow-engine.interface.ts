import { Workflow } from '../types/workflow';
import { WorkflowResult } from '../types/workflow-result';

export interface IWorkflowEngine {
    execute(workflow: Workflow, data: any): Promise<WorkflowResult>;
} 