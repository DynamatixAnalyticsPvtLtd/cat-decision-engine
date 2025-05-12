import { WorkflowMethod } from '../core/decorators/workflow-method.decorator';

export class SequentialTasksUseCase {
    @WorkflowMethod()
    async processTransaction(data: {
        userName: string;
        initialAmount: number;
        currency: string;
    }) {
        // The actual method implementation
        // The workflow will be executed automatically by the decorator
        return {
            success: true,
            data: {
                ...data,
                status: 'PROCESSED',
                message: 'Transaction processed successfully'
            }
        };
    }
} 