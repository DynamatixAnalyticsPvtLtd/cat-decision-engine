import { WorkflowEngine } from '../workflow-engine';
import { WorkflowContext } from '../types';
import { IWorkflowStore } from '../../storage/workflow-store';
import { DefaultLogger } from '../logging/default-logger';

export function WorkflowIntercept() {
    return function (
        target: Object,
        propertyKey: string | symbol,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const workflowEngine = new WorkflowEngine();
            const workflowStore = (this as any).workflowStore as IWorkflowStore;
            const logger = (this as any).logger || new DefaultLogger();

            // Get the actual class name from the instance
            const className = this.constructor.name;

            const context: WorkflowContext = {
                methodName: propertyKey.toString(),
                className,
                input: args[0] // Assuming first argument is the input
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
                    const result = await workflowEngine.executeWorkflow(workflow, context);

                    if (!result.success) {
                        logger.error('Workflow execution failed', {
                            workflowId: workflow.id,
                            error: result.error
                        });
                        throw new Error(result.error);
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
                throw error;
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