import { ILogger } from 'core/logging/logger.interface';
import { TaskType } from '../enums/task.enum';
import { Task } from '../../core/types/task';
import { TaskResult } from '../../core/types/task-result';
import { TaskError } from '../../core/errors/workflow-error';
import { ApiTaskExecutor } from '../api/api-task.executor';
import { TaskValidationService } from '../../core/services/task-validation.service';
import { ITaskExecutor } from '../interfaces/task-executor.interface';

export class TaskFactory {
    private taskExecutors: Map<TaskType, ITaskExecutor>;
    private validationService: TaskValidationService;

    constructor(private readonly logger: ILogger) {
        this.taskExecutors = new Map();
        this.validationService = new TaskValidationService();
        this.initializeTaskExecutors();
    }

    private initializeTaskExecutors(): void {
        this.taskExecutors.set(TaskType.API_CALL, new ApiTaskExecutor(this.logger));
        // Add other task executors as needed
    }

    public getTaskExecutor(taskType: TaskType): ITaskExecutor | null {
        return this.taskExecutors.get(taskType) || null;
    }

    public async executeTask(task: Task, context: { data: any }): Promise<TaskResult> {
        try {
            this.logger.debug('Starting task execution', { taskId: task.id, type: task.type });

            // Validate task
            this.validationService.validateTask(task);

            // Get executor for task type
            const executor = this.getTaskExecutor(task.type);
            if (!executor) {
                return {
                    task,
                    taskId: task.id,
                    success: false,
                    error: `Unsupported task type: ${task.type}`,
                    metadata: {
                        contextData: context.data
                    }
                };
            }

            // Execute task
            const output = await executor.execute(task, context);

            // Return task result
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
            this.logger.error('Task execution failed', {
                taskId: task.id,
                type: task.type,
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            return {
                task,
                taskId: task.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                metadata: {
                    contextData: context.data
                }
            };
        }
    }
} 