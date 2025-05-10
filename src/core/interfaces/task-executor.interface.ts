import { Task, TaskResult, WorkflowContext } from '../types';

export interface ITaskExecutor {
    executeTask(task: Task, context: WorkflowContext): Promise<TaskResult>;
    executeTasks(tasks: Task[], context: WorkflowContext): Promise<TaskResult[]>;
} 