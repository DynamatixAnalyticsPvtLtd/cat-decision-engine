import { Task, TaskResult, WorkflowContext } from '../types';
import { ITaskExecutor } from '../interfaces/task-executor.interface';
import { TaskType } from '../enums/task.enum';
import { ApiCallTaskConfig } from '../types/task';
import { TaskError } from '../errors/workflow-error';
import { TaskFactory } from '../../tasks/factory/task.factory';
import { ILogger } from '../interfaces/logger.interface';

export class TaskExecutor implements ITaskExecutor {
    private taskFactory: TaskFactory;

    constructor(private readonly logger: ILogger) {
        this.taskFactory = new TaskFactory(logger);
    }

    async executeTask(task: Task, context: WorkflowContext): Promise<TaskResult> {
        try {
            this.logger.debug('Starting task execution', {
                taskId: task.id,
                type: task.type
            });

            // Execute task using factory
            const result = await this.taskFactory.executeTask(task);

            // Add context data to result metadata
            return {
                task,
                ...result,
                metadata: {
                    ...result.metadata,
                    contextData: context.data
                }
            };
        } catch (error) {
            // Handle TaskError (includes validation errors)
            if (error instanceof TaskError) {
                this.logger.error('Task execution failed', {
                    taskId: task.id,
                    type: task.type,
                    error: error.message
                });

                return {
                    task,
                    taskId: task.id,
                    success: false,
                    error: error.message,
                    metadata: {
                        contextData: context.data
                    }
                };
            }

            // Handle unknown errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown task error';
            this.logger.error('Task execution failed', {
                taskId: task.id,
                type: task.type,
                error: errorMessage
            });

            return {
                task,
                taskId: task.id,
                success: false,
                error: errorMessage,
                metadata: {
                    contextData: context.data
                }
            };
        }
    }

    async executeTasks(tasks: Task[], context: WorkflowContext): Promise<TaskResult[]> {
        const results: TaskResult[] = [];
        let shouldContinue = true;

        for (const task of tasks) {
            if (!shouldContinue) {
                break;
            }

            try {
                const result = await this.executeTask(task, context);
                results.push(result);

                // Check if we should continue based on task configuration
                if (!result.success && task.onError === 'stop') {
                    shouldContinue = false;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown task error';
                results.push({
                    task,
                    taskId: task.id,
                    success: false,
                    error: errorMessage,
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