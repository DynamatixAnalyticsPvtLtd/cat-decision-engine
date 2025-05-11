import { WorkflowEngine } from '../workflow-engine';
import { WorkflowContext } from '../types/workflow-context';
import { IWorkflowStore } from '../../storage/workflow-store';
import { DefaultLogger } from '../logging/default-logger';
import { WorkflowResult } from '../types/workflow-result';
import { WorkflowError } from '../errors/workflow-error';
import { ValidationExecutor } from '../executors/validation-executor';
import { TaskExecutor } from '../executors/task-executor';

export function WorkflowIntercept() {
    return function (
        target: Object,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const logger = (this as any).logger || new DefaultLogger();
            const workflowStore = (this as any).workflowStore as IWorkflowStore;

            // Initialize executors
            const validationExecutor = new ValidationExecutor(logger);
            const taskExecutor = new TaskExecutor(logger);

            // Create workflow engine with dependencies
            const workflowEngine = new WorkflowEngine(
                validationExecutor,
                taskExecutor,
                logger
            );

            // Get the actual class name from the instance
            const className = this.constructor.name;
            const input = args[0]; // Assuming first argument is the input

            const context: WorkflowContext = {
                data: input,
                methodName: propertyKey.toString(),
                className
            };

            try {
                // Lookup workflow from store
                const workflow = await workflowStore.findWorkflowByTrigger(
                    context.className,
                    context.methodName
                );

                if (workflow) {
                    logger.debug('Executing workflow', {
                        workflowId: workflow.id,
                        trigger: `${context.className}.${context.methodName}`
                    });

                    // Execute workflow
                    const result = await workflowEngine.execute(workflow, context);

                    if (!result.success) {
                        const errorMessage = 'Workflow execution failed';
                        logger.error('Workflow execution failed', {
                            workflowId: workflow.id,
                            error: errorMessage
                        });
                        throw new WorkflowError(errorMessage, 'WORKFLOW_ERROR');
                    }

                    // Continue with original method
                    return await originalMethod.apply(this, args);
                }

                // No workflow found, just execute original method
                return await originalMethod.apply(this, args);
            } catch (error) {
                logger.error('Error in workflow interceptor', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    className: context.className,
                    methodName: context.methodName
                });
                throw error instanceof WorkflowError ? error : new WorkflowError(
                    error instanceof Error ? error.message : 'Unknown error',
                    'WORKFLOW_ERROR'
                );
            }
        };

        return descriptor;
    };
}

export abstract class BaseUseCase {
    constructor(
        protected readonly workflowStore: IWorkflowStore,
        protected readonly logger = new DefaultLogger()
    ) { }

    @WorkflowIntercept()
    async execute(input: any): Promise<any> {
        return this.handle(input);
    }

    protected abstract handle(input: any): Promise<any>;
} 