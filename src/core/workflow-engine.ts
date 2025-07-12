import { ILogger } from './logging/logger.interface';
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
import { MongoLogger } from './logging/mongo-logger';
import { v4 as uuidv4 } from 'uuid';
import { TaskType } from '../tasks/enums/task.enum';
import { initMongooseConnection } from './config/mongoose-connection';

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
        this.logger = logger || new MongoLogger();
        this.taskFactory = new TaskFactory(this.logger);
        this.taskExecutor = taskExecutor || new TaskExecutor(this.logger);
        this.validationExecutor = validationExecutor || new ValidationExecutor(this.logger);
    }

    async execute(workflow: Workflow | null, data: any): Promise<WorkflowResult> {
        if (!workflow) {
            throw new WorkflowError('Workflow is required', 'VALIDATION_ERROR');
        }
        if (!data) {
            throw new WorkflowError('Data is required', 'VALIDATION_ERROR');
        }
        await initMongooseConnection();

        const executionId = uuidv4();
        let result: WorkflowResult = {
            success: false,
            context: {
                data,
                workflowId: workflow?.id || '',
                workflowName: workflow?.name || '',
                executionId,
                validationResults: []
            },
            validationResults: [],
            taskResults: [],
            executionId
        };

        try {
            await this.logger.info(`Starting workflow execution: ${workflow.id}`, {
                workflow,
                workflowId: workflow.id,
                workflowName: workflow.name,
                data,
                executionId,
                status: 'started'
            });

            const context: WorkflowContext = {
                data,
                workflowId: workflow.id,
                workflowName: workflow.name,
                executionId,
                validationResults: []
            };
            const validationResults: ValidationResultItem[] = [];
            const taskResults: TaskResult[] = [];

            // Execute validations using ValidationExecutor
            const validationResult = await this.validationExecutor.execute(workflow.validations, data, context);
            validationResults.push(...validationResult.validationResults);

            // Update context with validation results
            context.validationResults = validationResult.validationResults;

            // Execute tasks using TaskExecutor
            if (workflow.tasks && workflow.tasks.length > 0) {
                // Filter alert tasks to execute even on validation failure
                const alertTasks = workflow.tasks.filter(task => task.type === TaskType.ALERT);

                // If validation should stop, only execute alert tasks
                if (validationResult.shouldStop) {
                    if (alertTasks.length > 0) {
                        const alertTaskResults = await this.taskExecutor.executeBatch(alertTasks, context);
                        taskResults.push(...alertTaskResults);
                    }
                }
                // Execute all tasks if validation passed or doesn't require stopping
                else {
                    const taskResult = await this.taskExecutor.executeBatch(workflow.tasks, context);
                    if (taskResult) {
                        taskResults.push(...taskResult);
                        if (taskResult.some(result => !result.success)) {
                            result = {
                                success: false,
                                context,
                                validationResults,
                                taskResults,
                                error: 'Task execution failed',
                                executionId
                            };
                            await this.logger.error(`Workflow task execution failed: ${workflow.id}`, {
                                workflow,
                                workflowId: workflow.id,
                                workflowName: workflow.name,
                                error: 'Task execution failed',
                                status: 'failed',
                                validationResults,
                                taskResults,
                                executionId
                            });
                            return result;
                        }
                    }
                }
            }

            result = {
                success: !validationResult.shouldStop, // Set success based on shouldStop
                context,
                validationResults,
                taskResults,
                error: validationResult.shouldStop ? 'Validation failed and workflow stopped' : undefined,
                executionId
            };


            return result;

        } catch (error) {
            await this.logger.error(`Workflow execution failed: ${workflow.id}`, {
                workflow,
                workflowId: workflow.id,
                workflowName: workflow.name,
                error,
                status: 'failed',
                validationResults: result?.validationResults || [],
                taskResults: result?.taskResults || [],
                executionId
            });
            throw error instanceof WorkflowError ? error : new WorkflowError(
                error instanceof Error ? error.message : 'Workflow execution failed',
                'WORKFLOW_ERROR'
            );
        }
    }
} 