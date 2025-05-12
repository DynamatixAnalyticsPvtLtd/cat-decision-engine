import { Task } from '../../core/types/task';
import { TaskType } from '../enums/task.enum';
import { TaskError } from '../../core/errors/workflow-error';
import { ITaskExecutor } from '../interfaces/task-executor.interface';
import { ILogger } from 'core/logging/logger.interface';
import { ExpressionEvaluator } from '../../core/utils/expression-evaluator';
import axios, { AxiosRequestConfig } from 'axios';

export class ApiTaskExecutor implements ITaskExecutor {
    private expressionEvaluator: ExpressionEvaluator;

    constructor(private readonly logger: ILogger) {
        this.expressionEvaluator = new ExpressionEvaluator();
    }

    public async execute(task: Task, context: { data: any }): Promise<any> {
        if (!task.config.url) {
            throw new TaskError('URL is required for API tasks');
        }

        // Resolve any template expressions in the request body
        const resolvedBody = task.config.body ?
            this.expressionEvaluator.evaluateObject(task.config.body, context.data) :
            undefined;

        const config: AxiosRequestConfig = {
            url: task.config.url,
            method: task.config.method || 'GET',
            headers: task.config.headers,
            data: resolvedBody,
            timeout: task.config.timeout
        };

        try {
            await this.logger.debug('Executing API task', {
                taskId: task.id,
                url: config.url,
                method: config.method,
                body: resolvedBody
            });

            const response = await axios(config);

            return {
                statusCode: response.status,
                headers: response.headers,
                data: response.data
            };
        } catch (error) {
            await this.logger.error('API task execution failed', {
                taskId: task.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            throw new TaskError(error instanceof Error ? error.message : 'API task execution failed');
        }
    }
} 