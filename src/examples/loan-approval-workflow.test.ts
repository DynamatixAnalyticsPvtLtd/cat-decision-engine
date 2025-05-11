import { loanApprovalWorkflow, processLoanApplication, applicationData } from './loan-approval-workflow';
import { WorkflowEngine } from '../core/workflow-engine';
import { DefaultLogger } from '../core/logging/default-logger';
import { ValidationExecutor } from '../core/executors/validation-executor';
import { createDecoratedWorkflowEngine } from '../core/decorators/workflow-engine.decorator';
import { Task } from '../core/types/task';
import { IWorkflowEngine } from '../core/interfaces/workflow-engine.interface';

// Mock the WorkflowEngine
jest.mock('../core/workflow-engine');

describe('Loan Approval Workflow', () => {
    let mockWorkflowEngine: jest.Mocked<IWorkflowEngine>;
    let logger: DefaultLogger;
    let validationExecutor: ValidationExecutor;
    let decoratedEngine: WorkflowEngine;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create instances
        logger = new DefaultLogger();
        validationExecutor = new ValidationExecutor(logger);
        mockWorkflowEngine = {
            execute: jest.fn()
        } as jest.Mocked<IWorkflowEngine>;

        // Create decorated engine with mock
        decoratedEngine = createDecoratedWorkflowEngine(mockWorkflowEngine, logger, validationExecutor);
    });

    it('should process a valid loan application successfully', async () => {
        // Mock successful workflow execution
        const successResult = {
            success: true,
            context: { data: applicationData },
            validationResults: [],
            taskResults: [
                {
                    task: loanApprovalWorkflow.tasks[0],
                    taskId: 'check-credit-history',
                    success: true,
                    output: { creditHistory: 'good' },
                    metadata: {
                        contextData: applicationData
                    }
                },
                {
                    task: loanApprovalWorkflow.tasks[1],
                    taskId: 'calculate-risk-score',
                    success: true,
                    output: { riskScore: 0.8 },
                    metadata: {
                        contextData: applicationData
                    }
                },
                {
                    task: loanApprovalWorkflow.tasks[2],
                    taskId: 'make-approval-decision',
                    success: true,
                    output: { approved: true, interestRate: 5.5 },
                    metadata: {
                        contextData: applicationData
                    }
                }
            ]
        };

        mockWorkflowEngine.execute.mockResolvedValueOnce(successResult);

        // Process the application
        const result = await processLoanApplication(applicationData);

        // Verify the result
        expect(result).toEqual(successResult);
        expect(result.success).toBe(true);
        expect(result.taskResults).toHaveLength(3);
        expect(result.taskResults[2].output.approved).toBe(true);
    });

    it('should fail validation for underage applicant', async () => {
        const underageApplication = {
            ...applicationData,
            age: 16
        };

        // Mock workflow execution with validation failure
        const validationFailureResult = {
            success: false,
            context: { data: underageApplication },
            validationResults: [
                {
                    rule: loanApprovalWorkflow.validations[0],
                    success: false,
                    message: 'Applicant must be at least 18 years old'
                }
            ],
            taskResults: []
        };

        mockWorkflowEngine.execute.mockResolvedValueOnce(validationFailureResult);

        // Process the application
        const result = await processLoanApplication(underageApplication);

        // Verify the result
        expect(result.success).toBe(false);
        expect(result.validationResults).toHaveLength(1);
        expect(result.validationResults[0].message).toBe('Applicant must be at least 18 years old');
        expect(result.taskResults).toHaveLength(0);
    });

    it('should fail validation for low income', async () => {
        const lowIncomeApplication = {
            ...applicationData,
            monthlyIncome: 2000
        };

        // Mock workflow execution with validation failure
        const validationFailureResult = {
            success: false,
            context: { data: lowIncomeApplication },
            validationResults: [
                {
                    rule: loanApprovalWorkflow.validations[1],
                    success: false,
                    message: 'Monthly income must be at least $3,000'
                }
            ],
            taskResults: []
        };

        mockWorkflowEngine.execute.mockResolvedValueOnce(validationFailureResult);

        // Process the application
        const result = await processLoanApplication(lowIncomeApplication);

        // Verify the result
        expect(result.success).toBe(false);
        expect(result.validationResults).toHaveLength(1);
        expect(result.validationResults[0].message).toBe('Monthly income must be at least $3,000');
        expect(result.taskResults).toHaveLength(0);
    });

    it('should handle task execution failure', async () => {
        // Mock workflow execution with task failure
        const taskFailureResult = {
            success: false,
            context: { data: applicationData },
            validationResults: [],
            taskResults: [
                {
                    task: loanApprovalWorkflow.tasks[0],
                    taskId: 'check-credit-history',
                    success: false,
                    error: 'Credit bureau service unavailable',
                    metadata: {
                        contextData: applicationData
                    }
                }
            ],
            error: 'Task execution failed'
        };

        mockWorkflowEngine.execute.mockResolvedValueOnce(taskFailureResult);

        // Process the application
        const result = await processLoanApplication(applicationData);

        // Verify the result
        expect(result.success).toBe(false);
        expect(result.taskResults).toHaveLength(1);
        expect(result.taskResults[0].success).toBe(false);
        expect(result.error).toBe('Task execution failed');
    });
}); 