import { WorkflowEngine } from '../workflow-engine';
import { DefaultLogger } from '../logging/default-logger';
import { ValidationExecutor } from '../executors/validation-executor';
import { createDecoratedWorkflowEngine } from './workflow-engine.decorator';
import { getWorkflowStore } from '../config/workflow-store-singleton';

export function WorkflowMethod() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            // Execute the original method first
            const methodResult = await originalMethod.apply(this, args);

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
                // If no workflow found, just return the method result
                return methodResult;
            }

            // Pass the original input object directly to the workflow
            const workflowData = args[0];

            const result = await workflowEngine.execute(workflow, workflowData);

            // If workflow was successful, return the original method result
            if (result.success) {
                return methodResult;
            }

            // If workflow failed, return the workflow result
            return result;
        };

        return descriptor;
    };
} 