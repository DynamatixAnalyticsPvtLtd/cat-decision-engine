import { BaseTask } from '../base/task.interface';
import { TaskMethod } from '../enums/task.enum';

export interface ApiTaskConfig {
    url: string;
    method: TaskMethod;
    headers?: Record<string, string>;
    body?: any;
    queryParams?: Record<string, string>;
    timeout?: number;
    retry?: {
        maxAttempts: number;
        delay: number;
    };
}

export interface ApiTask extends BaseTask {
    config: ApiTaskConfig;
}

export interface ApiTaskResult {
    statusCode: number;
    headers: Record<string, string>;
    data: any;
} 