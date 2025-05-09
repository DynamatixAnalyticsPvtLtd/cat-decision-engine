import { TaskType, TaskPriority } from '../enums/task.enum';

export interface BaseTask {
    id: string;
    type: TaskType;
    name?: string;
    description?: string;
    order: number;
    retry?: boolean;
    onError?: 'stop' | 'continue' | 'retry';
    timeout?: number;
    priority?: TaskPriority;
    metadata?: Record<string, any>;
}

export interface TaskResult<T = any> {
    success: boolean;
    taskId: string;
    output?: T;
    error?: string;
    metadata?: Record<string, any>;
} 