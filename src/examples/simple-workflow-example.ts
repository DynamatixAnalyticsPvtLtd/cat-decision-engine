import { WorkflowMethod } from '../core/decorators/workflow-method.decorator';
import { initializeLibrary } from '../core/config/library-config';
import dotenv from 'dotenv';

dotenv.config();

initializeLibrary({
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',        // Your MongoDB connection string
        database: 'gatehouse-qa',      // Optional, defaults to 'workflow-engine'
        collection: 'workflow_logs',        // Optional, defaults to 'workflows'
        options: {                           // Optional MongoDB connection options
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    }
});

// The class that uses the workflow
export class SimpleWorkflow {
    @WorkflowMethod()       
    async processData(data: any) {
        // This method will:
        // 1. Run the name validation
        // 2. If validation passes, create an alert
        // 3. Return the processed data
        console.log("DATA: ", data);
        
        return data;
    }
}

// Example usage
async function runExample() {
    try {
        const workflow = new SimpleWorkflow();
        // const sequentialTasksUseCase = new SequentialTasksUseCase();
        const result = await workflow.processData({personalDetails :{ docId : "68231dee3ba9a075d68f5692" , firstName : '' , lastName : '' }});
        console.log('Invalid result:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the example if this file is executed directly
if (require.main === module) {
    runExample();
} 