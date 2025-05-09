import { Workflow, WorkflowContext, WorkflowResult, ValidationResult, TaskResult, Task } from './types';
import { IWorkflowExecutor } from './interfaces/workflow-executor.interface';
import { IValidationExecutor } from './interfaces/validation-executor.interface';
import { ITaskExecutor } from './interfaces/task-executor.interface';
import { ILogger } from './interfaces/logger.interface';
import { ValidationExecutor } from './executors/validation-executor';
import { TaskExecutor } from './executors/task-executor';
import { ValidationOnFail } from './enums/validation.enum';
import { DefaultLogger } from './logging/default-logger';
import { WorkflowError, ValidationError, TaskError, ConfigurationError } from './errors/workflow-error';

export class WorkflowEngine implements IWorkflowExecutor {
    private validationExecutor: IValidationExecutor;
    private taskExecutor: ITaskExecutor;
    private logger: ILogger;
    private readonly maxRetries: number;

    constructor(
        validationExecutor?: IValidationExecutor,
        taskExecutor?: ITaskExecutor,
        logger?: ILogger,
        maxRetries: number = 3
    ) {
        this.validationExecutor = validationExecutor || new ValidationExecutor();
        this.taskExecutor = taskExecutor || new TaskExecutor();
        this.logger = logger || new DefaultLogger();
        this.maxRetries = maxRetries;
    }

    async executeWorkflow(workflow: Workflow, context: WorkflowContext): Promise<WorkflowResult> {
        if (!workflow) {
            throw new ConfigurationError('Workflow is required');
        }

        this.logger.info('Starting workflow execution', { workflowName: workflow.name });

        if (!context) {
            throw new ConfigurationError('Context is required');
        }

        const validationResults: ValidationResult[] = [];
        const taskResults: TaskResult[] = [];

        try {
            // Execute validations
            for (const rule of workflow.validations) {
                this.logger.debug('Executing validation rule', { rule });

                let result: ValidationResult;
                let retryCount = 0;

                do {
                    result = await this.validationExecutor.executeValidation(rule, context);

                    if (!result.success && rule.onFail === ValidationOnFail.RETRY && retryCount < this.maxRetries) {
                        this.logger.warn('Validation failed, retrying', {
                            rule,
                            attempt: retryCount + 1,
                            maxRetries: this.maxRetries
                        });
                        retryCount++;
                        await this.delay(1000 * retryCount); // Exponential backoff
                    } else {
                        break;
                    }
                } while (retryCount < this.maxRetries);

                validationResults.push(result);

                if (!result.success) {
                    if (rule.onFail === ValidationOnFail.STOP) {
                        this.logger.error('Validation failed with stop on fail', { rule, result });
                        return {
                            success: false,
                            context,
                            validationResults,
                            taskResults
                        };
                    } else if (rule.onFail === ValidationOnFail.FALLBACK && rule.fallback) {
                        this.logger.warn('Executing fallback validation', { rule });
                        const fallbackResult = await this.validationExecutor.executeValidation(rule.fallback, context);
                        validationResults.push(fallbackResult);

                        if (!fallbackResult.success) {
                            this.logger.error('Fallback validation failed', { rule, result: fallbackResult });
                            return {
                                success: false,
                                context,
                                validationResults,
                                taskResults
                            };
                        }
                    }
                }
            }

            // Execute tasks
            for (const task of workflow.tasks) {
                this.logger.debug('Executing task', { task });

                try {
                    let result: TaskResult;
                    let retryCount = 0;

                    do {
                        result = await this.taskExecutor.executeTask(task, context);

                        if (!result.success && task.retry && retryCount < this.maxRetries) {
                            this.logger.warn('Task failed, retrying', {
                                task,
                                attempt: retryCount + 1,
                                maxRetries: this.maxRetries
                            });
                            retryCount++;
                            await this.delay(1000 * retryCount); // Exponential backoff
                        } else {
                            break;
                        }
                    } while (retryCount < this.maxRetries);

                    // Update context with task output if available
                    if (result.output) {
                        this.logger.debug('Updating context with task output', {
                            task,
                            output: result.output
                        });

                        // Initialize context.data if needed
                        if (!context.data) {
                            context.data = {};
                        }

                        // Store task output in context.data with task ID as key
                        context.data[`task${task.id}`] = result.output;
                    }

                    // If task failed, return immediately
                    if (!result.success) {
                        return {
                            success: false,
                            context,
                            validationResults,
                            taskResults: [...taskResults, result]
                        };
                    }

                    taskResults.push(result);
                } catch (error) {
                    const taskError = new TaskError(
                        error instanceof Error ? error.message : 'Unknown task error',
                        task.id
                    );
                    this.logger.error('Task execution error', { task, error: taskError });

                    taskResults.push({
                        task,
                        taskId: task.id,
                        success: false,
                        error: taskError.message
                    });

                    return {
                        success: false,
                        context,
                        validationResults,
                        taskResults
                    };
                }
            }

            this.logger.info('Workflow executed successfully', {
                workflowName: workflow.name,
                validationCount: validationResults.length,
                taskCount: taskResults.length
            });

            return {
                success: true,
                context,
                validationResults,
                taskResults
            };
        } catch (error) {
            this.logger.error('Workflow execution error', {
                workflowName: workflow.name,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    async executeTask(task: Task, context: WorkflowContext): Promise<TaskResult> {
        this.logger.debug('Executing task', { task });

        try {
            const result = await this.taskExecutor.executeTask(task, context);
            return {
                task,
                taskId: task.id,
                success: result.success,
                output: result.output,
                error: result.error,
                metadata: result.metadata
            };
        } catch (error) {
            const taskError = new TaskError(
                error instanceof Error ? error.message : 'Unknown task error',
                task.id
            );
            this.logger.error('Task execution error', { task, error: taskError });

            return {
                task,
                taskId: task.id,
                success: false,
                error: taskError.message
            };
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 