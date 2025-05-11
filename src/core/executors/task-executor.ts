import { Task, WorkflowContext } from '../types';
import { TaskResult } from '../types/task-result';
import { ITaskExecutor } from '../interfaces/task-executor.interface';
import { TaskType } from '../enums/task.enum';
import { ApiCallTaskConfig } from '../types/task';
import { TaskError } from '../errors/workflow-error';
import { TaskFactory } from '../../tasks/factory/task.factory';
import { ILogger } from '../interfaces/logger.interface';
import { WorkflowError } from '../errors/workflow-error';

export class TaskExecutor implements ITaskExecutor {
    private taskFactory: TaskFactory;
    private logger: ILogger;

    constructor(logger?: ILogger) {
        this.logger = logger || console;
        this.taskFactory = new TaskFactory(this.logger);
    }

    async execute(task: Task, context: WorkflowContext): Promise<TaskResult> {
        try {
            this.logger.debug('Starting task execution', {
                taskId: task.id,
                type: task.type
            });

            const executor = this.taskFactory.getTaskExecutor(task.type);
            if (!executor) {
                throw new WorkflowError(`Unsupported task type: ${task.type}`, 'TASK_ERROR');
            }

            const result = await this.taskFactory.executeTask(task, context);

            return {
                task,
                taskId: task.id,
                success: true,
                output: result,
                metadata: {
                    contextData: context.data
                }
            };
        } catch (error) {
            this.logger.error('Task execution failed', {
                taskId: task.id,
                type: task.type,
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

        for (const task of tasks) {
            if (!shouldContinue) {
                break;
            }

            try {
                const result = await this.execute(task, context);
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