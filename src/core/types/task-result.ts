import { Task } from './task';

export interface TaskResult {
    success: boolean;
    taskId: string;
    task: Task;
    error?: string;
    output?: any;
    metadata?: Record<string, any>;
} 