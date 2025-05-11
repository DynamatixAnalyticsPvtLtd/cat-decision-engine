import { Task } from '../../core/types/task';
import { TaskType } from '../enums/task.enum';
import { TaskError } from '../../core/errors/workflow-error';
import { ITaskExecutor } from '../interfaces/task-executor.interface';
import { ILogger } from '../../core/interfaces/logger.interface';
import axios, { AxiosRequestConfig } from 'axios';

export class ApiTaskExecutor implements ITaskExecutor {
    constructor(private readonly logger: ILogger) { }

    public async execute(task: Task, context: { data: any }): Promise<any> {
        if (!task.config.url) {
            throw new TaskError('URL is required for API tasks');
        }

        const config: AxiosRequestConfig = {
            url: task.config.url,
            method: task.config.method || 'GET',
            headers: task.config.headers,
            data: task.config.body,
            timeout: task.config.timeout
        };

        try {
            this.logger.debug('Executing API task', {
                taskId: task.id,
                url: config.url,
                method: config.method
            });

            const response = await axios(config);

            return {
                statusCode: response.status,
                headers: response.headers,
                data: response.data
            };
        } catch (error) {
            this.logger.error('API task execution failed', {
                taskId: task.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            throw new TaskError(error instanceof Error ? error.message : 'API task execution failed');
        }
    }
} 