import { ILogger } from './interfaces/logger.interface';
import { DefaultLogger } from './logging/default-logger';
import { TaskFactory } from '../tasks/factory/task.factory';
import { TaskExecutor } from './executors/task-executor';
import { ValidationExecutor } from './executors/validation-executor';
import { Workflow } from './types/workflow';
import { WorkflowResult } from './types/workflow-result';
import { WorkflowError } from './errors/workflow-error';
import { WorkflowContext } from './types/workflow-context';
import { ValidationResult, TaskResult } from './types';

export class WorkflowEngine {
    private readonly logger: ILogger;
    private readonly taskFactory: TaskFactory;
    private readonly taskExecutor: TaskExecutor;
    private readonly validationExecutor: ValidationExecutor;
    private readonly maxRetries: number = 3;
    private readonly defaultTimeout: number = 5000;

    constructor(
        validationExecutor?: ValidationExecutor,
        taskExecutor?: TaskExecutor,
        logger?: ILogger
    ) {
        this.logger = logger || new DefaultLogger();
        this.taskFactory = new TaskFactory(this.logger);
        this.taskExecutor = taskExecutor || new TaskExecutor(this.logger);
        this.validationExecutor = validationExecutor || new ValidationExecutor();
    }

    async execute(workflow: Workflow | null, data: any): Promise<{
        success: boolean;
        context: WorkflowContext;
        validationResults: ValidationResult[];
        taskResults: TaskResult[];
    }> {
        if (!workflow) {
            throw new WorkflowError('Workflow is required', 'VALIDATION_ERROR');
        }

        try {
            this.logger.info(`Starting workflow execution: ${workflow.id}`, { workflow, data });

            const context: WorkflowContext = { data };
            const validationResults: ValidationResult[] = [];
            const taskResults: TaskResult[] = [];

            let stopOnValidationFail = false;

            // Execute validations
            for (const validation of workflow.validations) {
                const result = await this.validationExecutor.executeValidation(validation, context);
                validationResults.push(result);
                if (!result.success && validation.onFail === 'stop') {
                    stopOnValidationFail = true;
                    break;
                }
            }

            if (stopOnValidationFail) {
                return {
                    success: false,
                    context,
                    validationResults,
                    taskResults
                };
            }

            // Execute tasks
            for (const task of workflow.tasks) {
                const result = await this.taskExecutor.executeTask(task, context);
                taskResults.push(result);
                if (!result.success) {
                    break;
                }
            }

            const success = taskResults.every(result => result.success);
            const result = {
                success,
                context,
                validationResults,
                taskResults
            };

            this.logger.info(`Workflow completed successfully: ${workflow.id}`, { result });
            return result;

        } catch (error) {
            this.logger.error(`Workflow execution failed: ${workflow.id}`, { error });
            throw error;
        }
    }
} 