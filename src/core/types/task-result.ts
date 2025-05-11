import { Task } from './task';

export interface TaskResult {
    task: Task;
    taskId: string;
    success: boolean;
    result?: any;
    error?: string;
    metadata?: {
        contextData?: any;
        [key: string]: any;
    };
} 