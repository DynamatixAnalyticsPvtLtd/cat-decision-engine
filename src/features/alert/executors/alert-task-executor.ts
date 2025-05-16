import { ITaskExecutor } from '../../../core/interfaces/task-executor.interface';
import { Task } from '../../../core/types/task';
import { WorkflowContext } from '../../../core/types/workflow-context';
import { TaskResult } from '../../../core/types/task-result';
import { IAlertEngine } from '../interfaces/alert.interface';
import { AlertEngine } from '../../alert/alert-engine';
import { ILogger } from '../../../core/logging/logger.interface';
import { MongoLogger } from '../../../core/logging/mongo-logger';
import { AlertTask } from '../../../tasks/alert/alert-task.interface';
import { ValidationResultItem } from '../../../core/types/validation-result';
import { TaskType } from '../../../tasks/enums/task.enum';
import { ObjectId } from 'mongodb';

export class AlertTaskExecutor implements ITaskExecutor {
    private alertEngine: IAlertEngine;
    private logger: ILogger;

    constructor(logger?: ILogger) {
        this.logger = logger || new MongoLogger();
        this.alertEngine = new AlertEngine();
    }

    private processTemplate(template: string, data: any): string {
        // First replace any ${...} patterns with their values
        return template.replace(/\${([^}]+)}/g, (match, key) => {
            // Trim the key to remove any whitespace
            const trimmedKey = key.trim();
            
            // Handle both data.property and direct property access
            let value;
            if (trimmedKey.startsWith('data.')) {
                // If key starts with 'data.', remove it and look in data object
                const actualKey = trimmedKey.substring(5); // Remove 'data.'
                value = actualKey.split('.').reduce((obj: any, k: string) => obj?.[k], data);
            } else {
                // Direct property access
                value = trimmedKey.split('.').reduce((obj: any, k: string) => obj?.[k], data);
            }
            
            // If value is undefined or null, return the original match
            return value !== undefined && value !== null ? value : match;
        });
    }

    private validateObjectId(id: string): ObjectId {
        if (!ObjectId.isValid(id)) {
            throw new Error(`SourceId '${id}' is not a valid MongoDB ObjectId`);
        }
        return new ObjectId(id);
    }

    async execute(task: Task, context: WorkflowContext): Promise<TaskResult> {
        try {
            await this.logger.debug('Starting alert task execution', {
                taskId: task.id,
                workflowId: context.workflowId,
                workflowName: context.workflowName,
                executionId: context.executionId
            });

            // Check if this is an alert task
            if (task.type !== TaskType.ALERT) {
                throw new Error('Task is not an alert task');
            }

            const alertTask = task as AlertTask;
            const { source, sourceId, alertMessage, isActive, status, category, validationId } = alertTask.config;
            // console.log("ValidationID" , validationId);
            
            // If no validationId is provided, skip the alert
            if (!validationId) {
                await this.logger.info('Skipping alert task - no validationId provided', {
                    taskId: task.id,
                    workflowId: context.workflowId,
                    workflowName: context.workflowName,
                    executionId: context.executionId
                });

                return {
                    task,
                    taskId: task.id,
                    success: true,
                    output: null,
                    metadata: {
                        contextData: context.data,
                        skipped: true,
                        reason: 'No validationId provided'
                    }
                };
            }

            // Check if the corresponding validation failed
            if (!context.validationResults) {
                await this.logger.info('Skipping alert task - no validation results available', {
                    taskId: task.id,
                    validationId,
                    workflowId: context.workflowId,
                    workflowName: context.workflowName,
                    executionId: context.executionId
                });

                return {
                    task,
                    taskId: task.id,
                    success: true,
                    output: null,
                    metadata: {
                        contextData: context.data,
                        skipped: true,
                        reason: 'No validation results available'
                    }
                };
            }

            const validationResult = context.validationResults.find((vr: ValidationResultItem) => vr.rule.id === validationId);
            
            // Skip alert if validation passed or validation result not found
            if (!validationResult || validationResult.success) {
                await this.logger.info('Skipping alert task - validation passed or not found', {
                    taskId: task.id,
                    validationId,
                    workflowId: context.workflowId,
                    workflowName: context.workflowName,
                    executionId: context.executionId
                });

                return {
                    task,
                    taskId: task.id,
                    success: true,
                    output: null,
                    metadata: {
                        contextData: context.data,
                        skipped: true,
                        reason: 'Validation passed or not found'
                    }
                };
            }

            // Process templates in source and alertMessage
            const processedSource = this.processTemplate(source, context.data);
            const processedAlertMessage = this.processTemplate(alertMessage, context.data);
            const processedSourceId = this.processTemplate(sourceId, context.data);
            
            // Validate that sourceId is a valid ObjectId and get the actual ObjectId
            const validatedSourceId = this.validateObjectId(processedSourceId);

            // Create alert using the alert engine with the actual ObjectId
            const alert = await this.alertEngine.raiseAlert({
                source: processedSource,
                sourceId: validatedSourceId, // This is now an actual ObjectId
                alertMessage: processedAlertMessage,
                isActive,
                status,
                category
            });

            await this.logger.info('Alert created successfully', {
                taskId: task.id,
                alertId: alert.id,
                workflowId: context.workflowId,
                workflowName: context.workflowName,
                executionId: context.executionId
            });

            return {
                task,
                taskId: task.id,
                success: true,
                output: alert,
                metadata: {
                    contextData: context.data
                }
            };
        } catch (error) {
            await this.logger.error('Alert task execution failed', {
                taskId: task.id,
                workflowId: context.workflowId,
                workflowName: context.workflowName,
                executionId: context.executionId,
                error: error instanceof Error ? error.message : String(error)
            });

            return {
                task,
                taskId: task.id,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                metadata: {
                    contextData: context.data
                }
            };
        }
    }

    async executeBatch(tasks: Task[], context: WorkflowContext): Promise<TaskResult[]> {
        const results: TaskResult[] = [];
        for (const task of tasks) {
            const result = await this.execute(task, context);
            results.push(result);
            if (!result.success && task.onError === 'stop') {
                break;
            }
        }
        return results;
    }
} 