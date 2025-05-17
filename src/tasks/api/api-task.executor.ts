import { Task } from '../../core/types/task';
import { TaskType } from '../enums/task.enum';
import { TaskError } from '../../core/errors/workflow-error';
import { ITaskExecutor } from '../../core/interfaces/task-executor.interface';
import { ILogger } from '../../core/logging/logger.interface';
import { ExpressionEvaluator } from '../../core/utils/expression-evaluator';
import axios, { AxiosRequestConfig } from 'axios';
import { WorkflowContext } from '../../core/types/workflow-context';
import { TaskResult } from '../../core/types/task-result';
import { MongoLogger } from '../../core/logging/mongo-logger';

export class ApiTaskExecutor implements ITaskExecutor {
    private expressionEvaluator: ExpressionEvaluator;
    private logger: ILogger;

    constructor(logger?: ILogger) {
        this.expressionEvaluator = new ExpressionEvaluator();
        this.logger = logger || new MongoLogger();
    }

    public async execute(task: Task, context: WorkflowContext): Promise<TaskResult> {
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
            await this.logger.debug('Starting API task execution', {
                taskId: task.id,
                workflowId: context.workflowId,
                workflowName: context.workflowName,
                executionId: context.executionId
            });

            const response = await axios(config);

            return {
                task,
                taskId: task.id,
                success: true,
                output: {
                    statusCode: response.status,
                    data: response.data
                },
                metadata: {
                    contextData: context.data
                }
            };
        } catch (error) {
            await this.logger.error('API task execution failed', {
                taskId: task.id,
                workflowId: context.workflowId,
                workflowName: context.workflowName,
                executionId: context.executionId,
                error: error instanceof Error ? error.message : String(error)
            });

            return {
                task,
                taskId: task.id,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                metadata: {
                    contextData: context.data
                }
            };
        }
    }

    async executeBatch(tasks: Task[], context: WorkflowContext): Promise<TaskResult[]> {
        const results: TaskResult[] = [];
        for (const task of tasks) {
            const result = await this.execute(task, context);
            results.push(result);
            if (!result.success && task.onError === 'stop') {
                break;
            }
        }
        return results;
    }
} 