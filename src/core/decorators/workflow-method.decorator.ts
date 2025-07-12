import { WorkflowEngine } from '../workflow-engine';
import { DefaultLogger } from '../logging/default-logger';
import { ValidationExecutor } from '../executors/validation-executor';
import { createDecoratedWorkflowEngine } from './workflow-engine.decorator';
import { getWorkflowStore } from '../config/workflow-store-singleton';

interface WorkflowMethodOptions {
    background?: boolean;
}

export function WorkflowMethod(options: WorkflowMethodOptions = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        console.log('WorkflowMethod decorator called');
        console.log('target', target);
        console.log('propertyKey', propertyKey);
        console.log('descriptor', descriptor);
        console.log('options', options);

        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            console.log('args', args);

            // Execute the original method first
            const methodResult = await originalMethod.apply(this, args);

            // If background execution is enabled, run workflow in background
            if (options.background) {
                // Fire and forget - don't await the workflow
                setImmediate(async () => {
                    try {
                        await executeWorkflowInBackground(target, propertyKey, methodResult, this);
                    } catch (error) {
                        console.error('Background workflow execution failed:', error);
                    }
                });

                // Return method result immediately without waiting for workflow
                return methodResult;
            }

            // Synchronous workflow execution (original behavior)
            const workflowStore = await getWorkflowStore();

            const logger = new DefaultLogger();
            const validationExecutor = new ValidationExecutor(logger);
            const baseEngine = new WorkflowEngine();
            const workflowEngine = createDecoratedWorkflowEngine(baseEngine, logger, validationExecutor);

            // Get the entity type if it exists
            const entityType = (this as any).entityType;
            const trigger = entityType
                ? `${target.constructor.name}.${propertyKey}.${entityType}`
                : `${target.constructor.name}.${propertyKey}`;

            // Get the workflow for this method and entity
            const workflow = await workflowStore.findWorkflowByTrigger(
                target.constructor.name,
                propertyKey,
                entityType
            );

            if (!workflow) {
                // If no workflow found, just return the original method result
                return methodResult;
            }

            // Pass the method result to the workflow instead of input arguments
            const workflowData = methodResult;

            // Execute the workflow with the method result
            const result = await workflowEngine.execute(workflow, workflowData);

            // If workflow failed, return the workflow result
            if (!result.success) {
                return result;
            }

            // If workflow was successful, return the original method result
            return methodResult;
        };

        return descriptor;
    };
}

// Helper function to execute workflow in background
async function executeWorkflowInBackground(
    target: any,
    propertyKey: string,
    methodResult: any,
    context: any
): Promise<void> {
    const workflowStore = await getWorkflowStore();
    const logger = new DefaultLogger();
    const validationExecutor = new ValidationExecutor(logger);
    const baseEngine = new WorkflowEngine();
    const workflowEngine = createDecoratedWorkflowEngine(baseEngine, logger, validationExecutor);

    // Get the entity type if it exists
    const entityType = (context as any).entityType;
    const trigger = entityType
        ? `${target.constructor.name}.${propertyKey}.${entityType}`
        : `${target.constructor.name}.${propertyKey}`;

    logger.info('Starting background workflow execution', { trigger });

    // Get the workflow for this method and entity
    const workflow = await workflowStore.findWorkflowByTrigger(
        target.constructor.name,
        propertyKey,
        entityType
    );

    if (!workflow) {
        logger.info('No workflow found for background execution', { trigger });
        return;
    }

    try {
        // Execute the workflow with the method result
        const result = await workflowEngine.execute(workflow, methodResult);

        if (result.success) {
            logger.info('Background workflow completed successfully', {
                trigger,
                workflowId: workflow.id
            });
        } else {
            logger.error('Background workflow failed', {
                trigger,
                workflowId: workflow.id,
                error: result.error
            });
        }
    } catch (error) {
        logger.error('Background workflow execution threw an error', {
            trigger,
            workflowId: workflow.id,
            error
        });
    }
} 