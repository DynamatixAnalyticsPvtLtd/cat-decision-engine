import { Task, WorkflowContext } from '../types';
import { TaskResult } from '../types/task-result';

export interface ITaskExecutor {
    execute(task: Task, context: WorkflowContext): Promise<TaskResult>;
    executeBatch(tasks: Task[], context: WorkflowContext): Promise<TaskResult[]>;
} 