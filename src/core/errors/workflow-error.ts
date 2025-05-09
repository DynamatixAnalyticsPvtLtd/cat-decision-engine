export class WorkflowError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'WorkflowError';
    }
}

export class ValidationError extends WorkflowError {
    constructor(message: string, public readonly field?: string) {
        super(message, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

export class TaskError extends WorkflowError {
    constructor(message: string, public readonly taskId?: string) {
        super(message, 'TASK_ERROR');
        this.name = 'TaskError';
    }
}

export class ConfigurationError extends WorkflowError {
    constructor(message: string) {
        super(message, 'CONFIGURATION_ERROR');
        this.name = 'ConfigurationError';
    }
} 