import { TaskType, TaskMethod, TaskPriority, TaskRetryStrategy } from '../enums/task.enum';

export interface BaseTaskConfig {
    timeout?: number;
    retries?: number;
    retryStrategy?: TaskRetryStrategy;
    priority?: TaskPriority;
    dependencies?: string[];
}

export interface ApiCallTaskConfig extends BaseTaskConfig {
    url: string;
    method: TaskMethod;
    headers?: Record<string, string>;
    body?: any;
    queryParams?: Record<string, string>;
}

export interface DatabaseQueryTaskConfig extends BaseTaskConfig {
    query: string;
    params?: any[];
    connectionString?: string;
}

export interface EmailTaskConfig extends BaseTaskConfig {
    to: string[];
    subject: string;
    body: string;
    from?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: Array<{
        filename: string;
        content: string | Buffer;
        contentType?: string;
    }>;
}

export interface FileOperationTaskConfig extends BaseTaskConfig {
    operation: 'read' | 'write' | 'delete' | 'move' | 'copy';
    path: string;
    content?: string | Buffer;
    destination?: string;
    encoding?: string;
}

export interface WebhookTaskConfig extends BaseTaskConfig {
    url: string;
    method: TaskMethod;
    headers?: Record<string, string>;
    payload?: any;
    secret?: string;
}

export interface CustomFunctionTaskConfig extends BaseTaskConfig {
    function: string;
    args?: any[];
}

export interface ConditionalTaskConfig extends BaseTaskConfig {
    condition: string;
    onTrue: Task[];
    onFalse?: Task[];
}

export type TaskConfig =
    | ApiCallTaskConfig
    | DatabaseQueryTaskConfig
    | EmailTaskConfig
    | FileOperationTaskConfig
    | WebhookTaskConfig
    | CustomFunctionTaskConfig
    | ConditionalTaskConfig;

export interface Task {
    id: string;
    type: TaskType;
    name?: string;
    description?: string;
    order: number;
    config: TaskConfig;
    retry?: boolean;
    onError?: 'stop' | 'continue' | 'retry';
    timeout?: number;
    metadata?: Record<string, any>;
} 