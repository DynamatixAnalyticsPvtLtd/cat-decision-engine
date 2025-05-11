import { ILogger } from './interfaces/logger.interface';
import { DefaultLogger } from './logging/default-logger';
import { TaskFactory } from '../tasks/factory/task.factory';
import { TaskExecutor } from './executors/task-executor';
import { ValidationExecutor } from './executors/validation-executor';
import { Workflow } from './types/workflow';
import { WorkflowResult } from './types/workflow-result';
import { WorkflowError } from './errors/workflow-error';
import { WorkflowContext } from './types/workflow-context';
import { ValidationResultItem } from './types/validation-result';
import { TaskResult } from './types/task-result';
import { Task } from './types/task';

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
        this.validationExecutor = validationExecutor || new ValidationExecutor(this.logger);
    }

    async execute(workflow: Workflow | null, data: any): Promise<WorkflowResult> {
        if (!workflow) {
            throw new WorkflowError('Workflow is required', 'VALIDATION_ERROR');
        }

        try {
            this.logger.info(`Starting workflow execution: ${workflow.id}`, { workflow, data });

            const context: WorkflowContext = { data };
            const validationResults: ValidationResultItem[] = [];
            const taskResults: TaskResult[] = [];

            // Execute validations using ValidationExecutor
            const validationResult = await this.validationExecutor.execute(workflow.validations, data);
            validationResults.push(...validationResult.validationResults);
            if (!validationResult.success) {
                return {
                    success: false,
                    context,
                    validationResults,
                    taskResults,
                    error: 'Validation failed'
                };
            }

            // Execute tasks using TaskExecutor
            if (workflow.tasks && workflow.tasks.length > 0) {
                const taskResult = await this.taskExecutor.executeBatch(workflow.tasks, context);
                if (taskResult) {
                    taskResults.push(...taskResult);
                    if (taskResult.some(result => !result.success)) {
                        return {
                            success: false,
                            context,
                            validationResults,
                            taskResults,
                            error: 'Task execution failed'
                        };
                    }
                }
            }

            const result: WorkflowResult = {
                success: true,
                context,
                validationResults,
                taskResults
            };

            this.logger.info(`Workflow completed successfully: ${workflow.id}`, { result });
            return result;

        } catch (error) {
            this.logger.error(`Workflow execution failed: ${workflow.id}`, { error });
            throw error instanceof WorkflowError ? error : new WorkflowError(
                error instanceof Error ? error.message : 'Workflow execution failed',
                'WORKFLOW_ERROR'
            );
        }
    }
} 