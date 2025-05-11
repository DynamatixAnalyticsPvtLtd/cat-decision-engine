import { Task } from './task';

export interface TaskResult<T = any> {
    task: Task;
    taskId: string;
    success: boolean;
    output?: T;
    error?: string;
    metadata: {
        contextData: any;
        [key: string]: any;
    };
} 