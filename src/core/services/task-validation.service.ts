import { BaseTask } from '../../tasks/base/task.interface';
import { ApiTask } from '../../tasks/api/api-task.interface';
import { TaskType } from '../../tasks/enums/task.enum';
import { TaskError } from '../errors/workflow-error';

export class TaskValidationService {
    validateTask(task: BaseTask): void {
        this.validateBaseTask(task);
        this.validateTaskSpecificConfig(task);
    }

    private validateBaseTask(task: BaseTask): void {
        if (!task.id) {
            throw new TaskError('Task ID is required', task.id);
        }

        if (!task.type) {
            throw new TaskError('Task type is required', task.id);
        }

        if (typeof task.order !== 'number') {
            throw new TaskError('Task order must be a number', task.id);
        }
    }

    private validateTaskSpecificConfig(task: BaseTask): void {
        switch (task.type) {
            case TaskType.API_CALL:
                this.validateApiTask(task as ApiTask);
                break;
            default:
                throw new TaskError(`Unsupported task type: ${task.type}`, task.id);
        }
    }

    private validateApiTask(task: ApiTask): void {
        if (!task.config.url) {
            throw new TaskError('URL is required for API task', task.id);
        }

        if (!task.config.method) {
            throw new TaskError('Method is required for API task', task.id);
        }

        this.validateUrl(task.config.url, task.id);
        this.validateHttpMethod(task.config.method, task.id);
        this.validateTimeout(task.config.timeout, task.id);
        this.validateRetryConfig(task.config.retry, task.id);
    }

    private validateUrl(url: string, taskId: string): void {
        try {
            new URL(url);
        } catch (error) {
            throw new TaskError('Invalid URL format', taskId);
        }
    }

    private validateHttpMethod(method: string, taskId: string): void {
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        if (!validMethods.includes(method)) {
            throw new TaskError(`Invalid HTTP method: ${method}`, taskId);
        }
    }

    private validateTimeout(timeout: number | undefined, taskId: string): void {
        if (timeout !== undefined && (typeof timeout !== 'number' || timeout < 0)) {
            throw new TaskError('Timeout must be a positive number', taskId);
        }
    }

    private validateRetryConfig(retry: { maxAttempts: number; delay: number } | undefined, taskId: string): void {
        if (retry) {
            if (typeof retry.maxAttempts !== 'number' || retry.maxAttempts < 1) {
                throw new TaskError('Retry maxAttempts must be a positive number', taskId);
            }
            if (typeof retry.delay !== 'number' || retry.delay < 0) {
                throw new TaskError('Retry delay must be a non-negative number', taskId);
            }
        }
    }
} 