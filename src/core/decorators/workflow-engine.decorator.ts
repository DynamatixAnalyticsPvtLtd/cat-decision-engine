import { Workflow } from '../types/workflow';
import { WorkflowResult } from '../types/workflow-result';
import { ILogger } from '../interfaces/logger.interface';
import { ValidationExecutor } from '../executors/validation-executor';
import { ValidationResultItem } from '../types/validation-result';
import { IWorkflowEngine } from '../interfaces/workflow-engine.interface';

/**
 * Base decorator class for WorkflowEngine
 */
export abstract class WorkflowEngineDecorator implements IWorkflowEngine {
    protected workflowEngine: IWorkflowEngine;

    constructor(workflowEngine: IWorkflowEngine) {
        this.workflowEngine = workflowEngine;
    }

    async execute(workflow: Workflow, data: any): Promise<WorkflowResult> {
        return this.workflowEngine.execute(workflow, data);
    }
}

/**
 * Logging decorator for WorkflowEngine
 */
export class LoggingWorkflowEngineDecorator extends WorkflowEngineDecorator {
    private logger: ILogger;

    constructor(workflowEngine: IWorkflowEngine, logger: ILogger) {
        super(workflowEngine);
        this.logger = logger;
    }

    async execute(workflow: Workflow, data: any): Promise<WorkflowResult> {
        this.logger.info('Starting workflow execution', { workflow, data });

        try {
            const result = await super.execute(workflow, data);
            this.logger.info('Workflow completed successfully', {
                workflowId: workflow.id,
                result
            });
            return result;
        } catch (error) {
            this.logger.error('Workflow execution failed', {
                workflowId: workflow.id,
                error
            });
            throw error;
        }
    }
}

/**
 * Validation decorator for WorkflowEngine
 */
export class ValidationWorkflowEngineDecorator extends WorkflowEngineDecorator {
    private validationExecutor: ValidationExecutor;

    constructor(workflowEngine: IWorkflowEngine, validationExecutor: ValidationExecutor) {
        super(workflowEngine);
        this.validationExecutor = validationExecutor;
    }

    async execute(workflow: Workflow, data: any): Promise<WorkflowResult> {
        if (!workflow.validations || workflow.validations.length === 0) {
            return super.execute(workflow, data);
        }

        const validationResult = await this.validationExecutor.execute(workflow.validations, data);

        if (!validationResult.success) {
            const failedValidations = validationResult.validationResults.filter(v => !v.success);
            return {
                success: false,
                context: { data },
                validationResults: validationResult.validationResults,
                taskResults: [],
                error: failedValidations.map(v => v.message).join(', ')
            };
        }

        return super.execute(workflow, data);
    }
}

/**
 * Error handling decorator for WorkflowEngine
 */
export class ErrorHandlingWorkflowEngineDecorator extends WorkflowEngineDecorator {
    private logger: ILogger;

    constructor(workflowEngine: IWorkflowEngine, logger: ILogger) {
        super(workflowEngine);
        this.logger = logger;
    }

    async execute(workflow: Workflow, data: any): Promise<WorkflowResult> {
        try {
            return await super.execute(workflow, data);
        } catch (error) {
            this.logger.error('Workflow execution failed', {
                workflowId: workflow.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            return {
                success: false,
                context: { data },
                validationResults: [],
                taskResults: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

/**
 * Factory function to create a decorated workflow engine with all decorators
 */
export function createDecoratedWorkflowEngine(
    baseEngine: IWorkflowEngine,
    logger: ILogger,
    validationExecutor: ValidationExecutor
): IWorkflowEngine {
    return new ErrorHandlingWorkflowEngineDecorator(
        new ValidationWorkflowEngineDecorator(
            new LoggingWorkflowEngineDecorator(baseEngine, logger),
            validationExecutor
        ),
        logger
    );
} 