import { ILogger } from '../../core/interfaces/logger.interface';
import { ApiTask, ApiTaskResult } from './api-task.interface';
import { TaskResult } from '../base/task.interface';
import { TaskError } from '../../core/errors/workflow-error';
import axios from 'axios';

interface AxiosError {
    message: string;
    code?: string;
    response?: {
        statusText: string;
        status: number;
        data: any;
    };
}

export class ApiTaskExecutor {
    constructor(private readonly logger: ILogger) { }

    async execute(task: ApiTask): Promise<TaskResult<ApiTaskResult>> {
        try {
            this.logger.debug('Executing API task', { taskId: task.id, url: task.config.url });

            const config = {
                url: task.config.url,
                method: task.config.method,
                headers: task.config.headers,
                data: task.config.body,
                params: task.config.queryParams,
                timeout: task.config.timeout
            };

            let response = null;
            let attempts = 0;
            const maxAttempts = task.config.retry?.maxAttempts || 1;
            const delay = task.config.retry?.delay || 0;

            while (attempts < maxAttempts) {
                try {
                    response = await axios(config);
                    break;
                } catch (error) {
                    attempts++;
                    if (attempts < maxAttempts) {
                        this.logger.warn('Retrying API task', { taskId: task.id, attempt: attempts });
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        throw error;
                    }
                }
            }

            if (!response) {
                throw new Error('No response received from API');
            }

            const result: ApiTaskResult = {
                statusCode: response.status,
                headers: response.headers || {},
                data: response.data
            };

            this.logger.debug('API task completed successfully', {
                taskId: task.id,
                statusCode: result.statusCode
            });

            return {
                success: true,
                taskId: task.id,
                output: result,
                metadata: {
                    duration: response.headers?.['x-response-time'],
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            let errorMessage: string;
            const axiosError = error as AxiosError;

            if (axiosError.message && (axiosError.code || axiosError.response)) {
                if (axiosError.code === 'ECONNABORTED') {
                    errorMessage = `timeout of ${task.config.timeout}ms exceeded`;
                } else if (axiosError.response) {
                    errorMessage = axiosError.response.statusText || axiosError.message;
                } else {
                    errorMessage = axiosError.message;
                }
            } else {
                errorMessage = error instanceof Error ? error.message : 'Unknown API error';
            }

            this.logger.error('API task failed', { taskId: task.id, error: errorMessage });
            throw new TaskError(errorMessage, task.id);
        }
    }
} 