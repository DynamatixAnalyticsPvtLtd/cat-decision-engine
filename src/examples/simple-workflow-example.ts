import { WorkflowMethod } from '../core/decorators/workflow-method.decorator';
import { Workflow } from '../core/types/workflow';
import { TaskType } from '../tasks/enums/task.enum';
import { ValidationOnFail } from '../core/enums/validation.enum';

// Define the workflow configuration
export const simpleWorkflowConfig: Workflow = {
    id: 'simple-workflow',
    name: 'Simple Workflow',
    trigger: 'SimpleWorkflow.processData', // This matches the class and method name
    validations: [
        {
            id: 'name-validation',
            name: 'Name Validation',
            condition: 'data.name.length > 0',
            message: 'Name cannot be empty',
            onFail: ValidationOnFail.STOP
        }
    ],
    tasks: [
        {
            id: 'log-data',
            name: 'Log Data',
            type: TaskType.ALERT,
            order: 1,
            config: {
                source: 'SimpleWorkflow',
                sourceId: 'processData',
                alertMessage: 'Processing data: ${data.name}',
                isActive: true,
                status: 'raised',
                category: 'info'
            }
        }
    ]
};

// The class that uses the workflow
export class SimpleWorkflow {
    @WorkflowMethod()
    async processData(data: { name: string }) {
        // This method will:
        // 1. Run the name validation
        // 2. If validation passes, create an alert
        // 3. Return the processed data
        return data;
    }
}

// Example usage
async function runExample() {
    try {
        const workflow = new SimpleWorkflow();
        
        // This will trigger the workflow
        // const result = await workflow.processData({ name: 'John' });
        // console.log('Workflow result:', result);
        
        // This will fail validation
        const invalidResult = await workflow.processData({ name: '' });
        console.log('Invalid result:', invalidResult);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the example if this file is executed directly
if (require.main === module) {
    runExample();
} 