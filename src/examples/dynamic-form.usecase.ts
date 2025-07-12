import { WorkflowMethod } from '../core/decorators/workflow-method.decorator';

// Example of how a client would use the library for dynamic forms
export class DynamicFormUseCase {
    constructor(
        private readonly entityType: string // e.g., 'loan', 'insurance', 'mortgage'
    ) { }

    @WorkflowMethod()
    async processForm(data: any) {
        console.log('Processing form', data);
        // The decorator will:
        // 1. Get the workflow from MongoDB using the class, method name, and entityType as trigger
        // 2. Execute the workflow (validations and tasks)
        // 3. Only call this method if the workflow succeeds
        return {
            success: true,
            data: {
                ...data,
                entityType: this.entityType,
                status: 'PROCESSED',
                message: `${this.entityType} form processed successfully`
            }
        };
    }
}
