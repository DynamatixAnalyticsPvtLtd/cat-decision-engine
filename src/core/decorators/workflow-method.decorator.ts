import { WorkflowEngine } from '../workflow-engine';
import { DefaultLogger } from '../logging/default-logger';
import { ValidationExecutor } from '../executors/validation-executor';
import { createDecoratedWorkflowEngine } from './workflow-engine.decorator';
import { getWorkflowStore } from '../config/workflow-store-singleton';

export function WorkflowMethod() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
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
                throw new Error(`No workflow found for trigger: ${trigger}`);
            }

            // Execute the workflow
            const result = await workflowEngine.execute(workflow, args[0]);

            // If workflow was successful, execute the original method
            if (result.success) {
                return originalMethod.apply(this, args);
            }

            // If workflow failed, return the workflow result
            return result;
        };

        return descriptor;
    };
} 