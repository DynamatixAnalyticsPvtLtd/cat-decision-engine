import { Task } from '../../core/types';

export interface ITaskExecutor {
    execute(task: Task, context: any): Promise<any>;
} 