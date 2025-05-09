import { Task, TaskResult, WorkflowContext } from '../types';
import { ITaskExecutor } from '../interfaces/task-executor.interface';
import { TaskType } from '../enums/task.enum';
import { ApiCallTaskConfig } from '../types/task';
import { TaskError } from '../errors/workflow-error';

export class TaskExecutor implements ITaskExecutor {
    async executeTask(task: Task, context: WorkflowContext): Promise<TaskResult> {
        try {
            if (task.type === TaskType.API_CALL) {
                const config = task.config as ApiCallTaskConfig;

                // Validate required fields
                if (!config.url) {
                    throw new TaskError('URL is required for API task', task.id);
                }

                if (!config.method) {
                    throw new TaskError('Method is required for API task', task.id);
                }

                // In a real implementation, this would make an actual API call
                // For now, we'll simulate a successful response
                const response = {
                    statusCode: 200,
                    headers: {},
                    data: { result: 'success' }
                };

                return {
                    task,
                    taskId: task.id,
                    success: true,
                    output: response
                };
            }

            throw new TaskError(`Unsupported task type: ${task.type}`, task.id);
        } catch (error) {
            if (error instanceof TaskError) {
                return {
                    task,
                    taskId: task.id,
                    success: false,
                    error: error.message
                };
            }

            return {
                task,
                taskId: task.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown task error'
            };
        }
    }
} 