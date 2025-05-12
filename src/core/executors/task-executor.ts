import { Task, WorkflowContext } from '../types';
import { TaskResult } from '../types/task-result';
import { ITaskExecutor } from '../interfaces/task-executor.interface';
import { TaskType } from '../enums/task.enum';
import { TaskError } from '../errors/workflow-error';
import { TaskFactory } from '../../tasks/factory/task.factory';
import { ILogger } from 'core/logging/logger.interface';
import { MongoLogger } from '../logging/mongo-logger';

export class TaskExecutor implements ITaskExecutor {
    private taskFactory: TaskFactory;
    private logger: ILogger;

    constructor(logger?: ILogger) {
        this.logger = logger || new MongoLogger();
        this.taskFactory = new TaskFactory(this.logger);
    }

    async execute(task: Task, context: WorkflowContext): Promise<TaskResult> {
        try {
            await this.logger.debug('Starting task execution', {
                taskId: task.id,
                type: task.type,
                workflowId: context.workflowId,
                workflowName: context.workflowName,
                executionId: context.executionId
            });

            const executor = this.taskFactory.getTaskExecutor(task.type);
            if (!executor) {
                throw new TaskError(`Unsupported task type: ${task.type}`, '1');
            }

            const output = await executor.execute(task, context);

            // For API tasks, check if the response is successful
            if (task.type === TaskType.API_CALL) {
                if (output.statusCode >= 400) {
                    throw new TaskError(`API request failed with status ${output.statusCode}`, 'API_ERROR');
                }
            }

            return {
                task,
                taskId: task.id,
                success: true,
                output,
                metadata: {
                    contextData: context.data
                }
            };
        } catch (error) {
            await this.logger.error('Task execution failed', {
                taskId: task.id,
                type: task.type,
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
        let shouldContinue = true;

        // Sort tasks by order before execution
        const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);

        for (const task of sortedTasks) {
            if (!shouldContinue) {
                break;
            }

            try {
                await this.logger.debug('Starting task execution', {
                    taskId: task.id,
                    type: task.type,
                    workflowId: context.workflowId,
                    workflowName: context.workflowName,
                    executionId: context.executionId
                });

                const executor = this.taskFactory.getTaskExecutor(task.type);
                if (!executor) {
                    throw new TaskError(`Unsupported task type: ${task.type}`, '1');
                }

                // Create a new context with accumulated results
                const taskContext = {
                    ...context,
                    data: {
                        ...context.data,
                        // Add previous task results to the context
                        ...results.reduce((acc, result) => ({
                            ...acc,
                            [result.taskId]: result.output
                        }), {})
                    }
                };

                const output = await executor.execute(task, taskContext);

                // For API tasks, check if the response is successful
                if (task.type === TaskType.API_CALL) {
                    if (output.statusCode >= 400) {
                        throw new TaskError(`API request failed with status ${output.statusCode}`, 'API_ERROR');
                    }
                }

                const result = {
                    task,
                    taskId: task.id,
                    success: true,
                    output,
                    metadata: {
                        contextData: taskContext.data
                    }
                };

                results.push(result);
            } catch (error) {
                await this.logger.error('Task execution failed', {
                    taskId: task.id,
                    type: task.type,
                    workflowId: context.workflowId,
                    workflowName: context.workflowName,
                    executionId: context.executionId,
                    error: error instanceof Error ? error.message : String(error)
                });

                results.push({
                    task,
                    taskId: task.id,
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    metadata: {
                        contextData: context.data
                    }
                });

                if (task.onError === 'stop') {
                    shouldContinue = false;
                }
            }
        }

        return results;
    }
} 