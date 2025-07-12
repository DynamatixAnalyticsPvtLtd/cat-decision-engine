import { Workflow } from '../core/types/workflow';
import { WorkflowMethod } from '../core/decorators/workflow-method.decorator';
import { IWorkflowStore, MongoWorkflowStore } from '../storage/workflow-store';

import { MongoLogger } from '../core/logging/mongo-logger';
import { ILogger } from '../core/logging/logger.interface';

// Example of how a client would use the library
export class LoanApprovalUseCase {
    private logger: ILogger;

    constructor(private readonly workflowStore: IWorkflowStore) {
        this.logger = new MongoLogger();
    }

    @WorkflowMethod()
    async processLoanApplication(data: any) {
        // The decorator will:
        // 1. Get the workflow from MongoDB using the class and method name as trigger
        // 2. Execute the workflow (validations and tasks)
        // 3. Only call this method if the workflow succeeds
        return {
            success: true,
            data: {
                ...data,
                status: 'APPROVED',
                message: 'Loan application processed successfully'
            }
        };
    }

    @WorkflowMethod()
    async checkEligibility(data: any) {
        // Another workflow for checking eligibility
        return {
            success: true,
            data: {
                ...data,
                eligible: true,
                message: 'Applicant is eligible for the loan'
            }
        };
    }
}

// Example of how to use the use case
async function example() {
    // In a real application, you would get the MongoDB collection from your database connection
    const collection = {}; // Replace with actual MongoDB collection
    const logger = new MongoLogger();
    const workflowStore = new MongoWorkflowStore(collection, logger);

    const useCase = new LoanApprovalUseCase(workflowStore);

    const result = await useCase.processLoanApplication({
        age: 25,
        monthlyIncome: 5000,
        creditScore: 720,
        loanAmount: 50000,
        loanTerm: 36
    });

    console.log('Result:', result);
} 