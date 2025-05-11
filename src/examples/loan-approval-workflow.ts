import { Workflow } from '../core/types/workflow';
import { ValidationRule } from '../core/types/validation-rule';
import { Task } from '../core/types/task';
import { IWorkflowStore, MongoWorkflowStore } from '../storage/workflow-store';
import { TaskType, TaskMethod } from '../core/enums/task.enum';
import { createDecoratedWorkflowEngine } from '../core/decorators/workflow-engine.decorator';
import { WorkflowEngine } from '../core/workflow-engine';
import { DefaultLogger } from '../core/logging/default-logger';
import { ValidationExecutor } from '../core/executors/validation-executor';
import { ValidationOnFail } from '../core/enums/validation.enum';
// Define validation rules
const validationRules: ValidationRule[] = [
    {
        id: 'age-validation',
        name: 'Age Validation',
        condition: 'data.age >= 18',
        message: 'Applicant must be at least 18 years old',
        onFail: ValidationOnFail.STOP
    },
    {
        id: 'income-validation',
        name: 'Income Validation',
        condition: 'data.monthlyIncome >= 3000',
        message: 'Monthly income must be at least $3,000',
        onFail: ValidationOnFail.STOP
    },
    {
        id: 'credit-score-validation',
        name: 'Credit Score Validation',
        condition: 'data.creditScore >= 650',
        message: 'Credit score must be at least 650',
        onFail: ValidationOnFail.STOP
    }
];

// Define tasks
const tasks: Task[] = [
    {
        id: 'check-credit-history',
        name: 'Check Credit History',
        type: TaskType.API_CALL,
        order: 1,
        config: {
            url: 'https://api.credit-bureau.com/history',
            method: TaskMethod.POST,
            headers: {
                'Content-Type': 'application/json'
            }
        }
    },
    {
        id: 'calculate-risk-score',
        name: 'Calculate Risk Score',
        type: TaskType.API_CALL,
        order: 2,
        config: {
            url: 'https://api.risk-scoring.com/calculate',
            method: TaskMethod.POST,
            headers: {
                'Content-Type': 'application/json'
            }
        }
    },
    {
        id: 'make-approval-decision',
        name: 'Make Approval Decision',
        type: TaskType.API_CALL,
        order: 3,
        config: {
            url: 'https://api.loan-approval.com/decide',
            method: TaskMethod.POST,
            headers: {
                'Content-Type': 'application/json'
            }
        }
    }
];

// Create the workflow
const loanApprovalWorkflow: Workflow = {
    id: 'loan-approval',
    name: 'Loan Approval Workflow',
    trigger: 'loan-application',
    validations: validationRules,
    tasks: tasks
};

// Client uses the decorator to create their workflow engine
class LoanApprovalEngine {
    private workflowEngine;
    private workflowStore: IWorkflowStore;

    constructor(collection: any) {
        const logger = new DefaultLogger();
        const validationExecutor = new ValidationExecutor(logger);
        const baseEngine = new WorkflowEngine();
        this.workflowEngine = createDecoratedWorkflowEngine(baseEngine, logger, validationExecutor);
        this.workflowStore = new MongoWorkflowStore(collection, logger);
    }

    async processApplication(data: any) {
        const workflow = await this.workflowStore.findWorkflowByTrigger('LoanApprovalEngine', 'processApplication');
        if (!workflow) {
            throw new Error('Workflow not found');
        }
        return this.workflowEngine.execute(workflow, data);
    }
}

// Example application data
const applicationData = {
    age: 25,
    monthlyIncome: 5000,
    creditScore: 720,
    loanAmount: 50000,
    loanTerm: 36
};

// Create a function to process loan applications
async function processLoanApplication(data: any) {
    const logger = new DefaultLogger();
    const validationExecutor = new ValidationExecutor(logger);
    const baseEngine = new WorkflowEngine();
    const workflowEngine = createDecoratedWorkflowEngine(baseEngine, logger, validationExecutor);
    return workflowEngine.execute(loanApprovalWorkflow, data);
}

// Export for testing
export {
    loanApprovalWorkflow,
    LoanApprovalEngine,
    applicationData,
    processLoanApplication
}; 