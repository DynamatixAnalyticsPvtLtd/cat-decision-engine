import { ILogger } from '../../core/interfaces/logger.interface';
import { TaskType } from '../enums/task.enum';
import { BaseTask, TaskResult } from '../base/task.interface';
import { ApiTask } from '../api/api-task.interface';
import { TaskError } from '../../core/errors/workflow-error';
import { ApiTaskExecutor } from '../api/api-task.executor';
import { TaskValidationService } from '../../core/services/task-validation.service';
import { ITaskExecutor } from '../interfaces/task-executor.interface';

export class TaskFactory {
    private executors: Map<TaskType, ITaskExecutor>;
    private validationService: TaskValidationService;

    constructor(private readonly logger: ILogger) {
        this.validationService = new TaskValidationService();
        this.executors = new Map();
        this.initializeExecutors();
    }

    private initializeExecutors(): void {
        this.executors.set(TaskType.API_CALL, new ApiTaskExecutor(this.logger));
    }

    getTaskExecutor(type: TaskType): ITaskExecutor | undefined {
        return this.executors.get(type);
    }

    async executeTask(task: BaseTask, context: any): Promise<TaskResult> {
        // Validate task before execution
        this.validationService.validateTask(task);

        const executor = this.getTaskExecutor(task.type);

        if (!executor) {
            const error = `No executor found for task type: ${task.type}`;
            this.logger.error(error, { taskId: task.id });
            throw new TaskError(error, task.id);
        }

        try {
            this.logger.debug('Starting task execution', {
                taskId: task.id,
                type: task.type
            });

            // Type assertion based on task type
            switch (task.type) {
                case TaskType.API_CALL:
                    return await executor.execute(task as ApiTask, context);
                default:
                    throw new TaskError(`Unsupported task type: ${task.type}`, task.id);
            }
        } catch (error) {
            if (error instanceof TaskError) {
                throw error;
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown task execution error';
            this.logger.error('Task execution failed', {
                taskId: task.id,
                type: task.type,
                error: errorMessage
            });

            throw new TaskError(errorMessage, task.id);
        }
    }
} 