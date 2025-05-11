import { Task } from '../types/task';
import { TaskType } from '../../tasks/enums/task.enum';
import { TaskError } from '../errors/workflow-error';

export class TaskValidationService {
    public validateTask(task: Task): void {
        if (!task.id) {
            throw new TaskError('Task ID is required');
        }

        if (!task.name) {
            throw new TaskError('Task name is required');
        }

        if (!task.type) {
            throw new TaskError('Task type is required');
        }

        if (typeof task.order !== 'number') {
            throw new TaskError('Task order must be a number');
        }

        if (!task.config) {
            throw new TaskError('Task configuration is required');
        }

        // Validate task type specific configuration
        switch (task.type) {
            case TaskType.API_CALL:
                this.validateApiTask(task);
                break;
            default:
                throw new TaskError(`Unsupported task type: ${task.type}`);
        }
    }

    private validateApiTask(task: Task): void {
        if (!task.config.url) {
            throw new TaskError('URL is required for API tasks');
        }

        if (task.config.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(task.config.method)) {
            throw new TaskError('Invalid HTTP method for API task');
        }

        if (task.config.timeout && typeof task.config.timeout !== 'number') {
            throw new TaskError('Timeout must be a number');
        }

        if (task.config.headers && typeof task.config.headers !== 'object') {
            throw new TaskError('Headers must be an object');
        }
    }
} 