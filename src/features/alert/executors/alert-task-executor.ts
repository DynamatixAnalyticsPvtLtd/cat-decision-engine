import { ITaskExecutor } from '../../../core/interfaces/task-executor.interface';
import { Task } from '../../../core/types/task';
import { WorkflowContext } from '../../../core/types/workflow-context';
import { TaskResult } from '../../../core/types/task-result';
import { IAlertEngine } from '../interfaces/alert.interface';
import { AlertEngine } from '../../alert/alert-engine';
import { ILogger } from '../../../core/logging/logger.interface';
import { MongoLogger } from '../../../core/logging/mongo-logger';

export class AlertTaskExecutor implements ITaskExecutor {
    private alertEngine: IAlertEngine;
    private logger: ILogger;

    constructor(logger?: ILogger) {
        this.logger = logger || new MongoLogger();
        this.alertEngine = new AlertEngine();
    }

    async execute(task: Task, context: WorkflowContext): Promise<TaskResult> {
        try {
            await this.logger.debug('Starting alert task execution', {
                taskId: task.id,
                workflowId: context.workflowId,
                workflowName: context.workflowName,
                executionId: context.executionId
            });

            // Extract alert configuration from task config
            const { source, sourceId, alertMessage, isActive, status, category } = task.config;

            // Create alert using the alert engine
            const alert = await this.alertEngine.raiseAlert({
                source,
                sourceId,
                alertMessage,
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