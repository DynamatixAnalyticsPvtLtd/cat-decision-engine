import { ILogger } from '../../core/interfaces/logger.interface';
import { TaskType } from '../enums/task.enum';
import { Task, TaskResult } from '../../core/types/task';
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
                throw new TaskError(`Unsupported task type: ${task.type}`);
            }

            // Execute task
            const output = await executor.execute(task, context);

            // Return task result
            return {
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

            if (error instanceof TaskError) {
                throw error;
            }

            throw new TaskError(error instanceof Error ? error.message : 'Unknown error');
        }
    }
} 