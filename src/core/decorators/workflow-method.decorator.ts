import { WorkflowEngine } from '../workflow-engine';
import { DefaultLogger } from '../logging/default-logger';
import { ValidationExecutor } from '../executors/validation-executor';
import { createDecoratedWorkflowEngine } from './workflow-engine.decorator';
import { getWorkflowStore } from '../config/workflow-store-singleton';

export function WorkflowMethod() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        console.log('WorkflowMethod decorator called');
        console.log('target', target);
        console.log('propertyKey', propertyKey);
        console.log('descriptor', descriptor);
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
                // If no workflow found, just execute the original method
                return originalMethod.apply(this, args);
            }

            // Pass the original input object directly to the workflow
            const workflowData = args[0];

            // Execute the workflow first
            const result = await workflowEngine.execute(workflow, workflowData);

            // If workflow failed, return the workflow result
            if (!result.success) {
                return result;
            }

            // If workflow was successful, execute the original method
            return originalMethod.apply(this, args);
        };

        return descriptor;
    };
} 