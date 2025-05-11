import { Task } from '../../core/types/task';

export interface ITaskExecutor {
    execute(task: Task, context: { data: any }): Promise<any>;
} 