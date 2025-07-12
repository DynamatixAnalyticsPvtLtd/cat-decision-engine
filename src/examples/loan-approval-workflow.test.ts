import { loanApprovalWorkflow, applicationData } from './loan-approval-workflow';
import { DefaultLogger } from '../core/logging/default-logger';
import { ValidationExecutor } from '../core/executors/validation-executor';
import { MongoClient } from 'mongodb';
import { MongoLogger } from '../core/logging/mongo-logger';
import { ILogger } from '../core/logging/logger.interface';
import { WorkflowEngine } from '../core/workflow-engine';
import { getConfig } from '../core/config/library-config';

describe('Loan Approval Workflow', () => {
    let logger: MongoLogger;
    const { mongodb } = getConfig();
    let validationExecutor: ValidationExecutor;
    let mongoClient: MongoClient;
    const mongoUrl = mongodb.uri;
    const dbName = mongodb.database || 'workflow-engine';
    const collectionName = mongodb.collection || 'workflow_logs';

    beforeAll(async () => {
        if (!mongoUrl) {
            throw new Error('MONGODB_URI environment variable is not set');
        }
        mongoClient = new MongoClient(mongoUrl);
        await mongoClient.connect();
        // Clear the collection before tests
        await mongoClient.db(dbName).collection(collectionName).deleteMany({});
    }, 10000);

    afterAll(async () => {
        await mongoClient.close();
    }, 5000);

    beforeEach(() => {
        // Create instances
        logger = new MongoLogger();
        validationExecutor = new ValidationExecutor(logger);
    }, 5000);

    afterEach(async () => {
        if (logger) {
            await logger.close();
        }
    }, 5000);

    it('should process a valid loan application successfully', async () => {
        // Process the application
        const result = await processLoanApplication(applicationData, logger);

        // Verify the result
        expect(result.success).toBe(true);
        expect(result.validationResults).toHaveLength(3);
        result.validationResults.forEach(vr => expect(vr.success).toBe(true));
        expect(result.taskResults).toHaveLength(3);

        // Verify JSONPlaceholder responses
        result.taskResults.forEach((tr, index) => {
            expect(tr.success).toBe(true);
            expect(tr.output).toHaveProperty('statusCode', 200);
            expect(tr.output).toHaveProperty('headers');
            expect(tr.output).toHaveProperty('data');
            expect(tr.output.data).toHaveProperty('id', index + 1);
            expect(tr.output.data).toHaveProperty('title');
            expect(tr.output.data).toHaveProperty('body');
        });

        // Verify logs for this workflow run
        const logs = await mongoClient.db(dbName).collection(collectionName).find({
            workflowId: 'loan-approval',
            executionId: result.executionId
        }).toArray();
        expect(logs.length).toBeGreaterThan(0);
    });

    it('should fail validation for underage applicant', async () => {
        const underageApplication = {
            ...applicationData,
            age: 16
        };

        // Process the application
        const result = await processLoanApplication(underageApplication, logger);

        // Verify the result
        expect(result.success).toBe(false);
        expect(result.validationResults).toHaveLength(3);
        const ageValidation = result.validationResults.find(vr => vr.rule.id === 'age-validation')!;
        expect(ageValidation.success).toBe(false);
        expect(ageValidation.message).toBe('Applicant must be at least 18 years old');
        result.validationResults.filter(vr => vr.rule.id !== 'age-validation').forEach(vr => expect(vr.success).toBe(true));
        expect(result.taskResults).toHaveLength(0);

        // Verify logs for this workflow run
        const logs = await mongoClient.db(dbName).collection(collectionName).find({
            workflowId: 'loan-approval',
            executionId: result.executionId
        }).toArray();
        expect(logs.length).toBeGreaterThan(0);
    });

    it('should fail validation for low income', async () => {
        const lowIncomeApplication = {
            ...applicationData,
            monthlyIncome: 2000
        };

        // Process the application
        const result = await processLoanApplication(lowIncomeApplication, logger);

        // Verify the result
        expect(result.success).toBe(false);
        expect(result.validationResults).toHaveLength(3);
        const incomeValidation = result.validationResults.find(vr => vr.rule.id === 'income-validation')!;
        expect(incomeValidation.success).toBe(false);
        expect(incomeValidation.message).toBe('Monthly income must be at least $3,000');
        result.validationResults.filter(vr => vr.rule.id !== 'income-validation').forEach(vr => expect(vr.success).toBe(true));
        expect(result.taskResults).toHaveLength(0);

        // Verify logs for this workflow run
        const logs = await mongoClient.db(dbName).collection(collectionName).find({
            workflowId: 'loan-approval',
            executionId: result.executionId
        }).toArray();
        expect(logs.length).toBeGreaterThan(0);
    });

    it('should handle task execution failure', async () => {
        // Temporarily modify the workflow to use an invalid URL
        const originalTasks = [...loanApprovalWorkflow.tasks];
        loanApprovalWorkflow.tasks[0].config.url = 'https://invalid-url-that-does-not-exist.com';

        try {
            // Process the application
            const result = await processLoanApplication(applicationData, logger);

            // Verify the result
            expect(result.success).toBe(false);
            expect(result.error).toBe('Task execution failed');
            expect(result.validationResults).toHaveLength(3);
            result.validationResults.forEach(vr => expect(vr.success).toBe(true));
            expect(result.taskResults.length).toBe(3);
            expect(result.taskResults[0].success).toBe(false);
            expect(result.taskResults[0].error).toMatch(/ENOTFOUND|ECONNREFUSED/);
            expect(result.taskResults[1].success).toBe(true);
            expect(result.taskResults[2].success).toBe(true);

            // Verify logs for this workflow run
            const logs = await mongoClient.db(dbName).collection(collectionName).find({
                workflowId: 'loan-approval',
                executionId: result.executionId
            }).toArray();
            expect(logs.length).toBeGreaterThan(0);
        } finally {
            // Restore the original tasks
            loanApprovalWorkflow.tasks = originalTasks;
        }
    });

    it('should store validation and task results in logs', async () => {
        // Ensure we're using the original workflow with valid URLs
        loanApprovalWorkflow.tasks = loanApprovalWorkflow.tasks.map(task => ({
            ...task,
            config: {
                ...task.config,
                url: `https://jsonplaceholder.typicode.com/posts/${task.id === 'check-credit-history' ? '1' : task.id === 'calculate-risk-score' ? '2' : '3'}`
            }
        }));

        // Process the application
        const result = await processLoanApplication(applicationData, logger);

        // Verify the result
        expect(result.success).toBe(true);
        expect(result.validationResults).toHaveLength(3);
        expect(result.taskResults).toHaveLength(3);
        expect(result.executionId).toBeDefined();

        // Add a delay to ensure all logs are written
        await new Promise(res => setTimeout(res, 1000));
        // Query logs for this executionId only
        const logs = await mongoClient.db(dbName).collection(collectionName).find({
            executionId: result.executionId
        }).toArray();
        console.log('DEBUG: logs for executionId', result.executionId, JSON.stringify(logs, null, 2));
        expect(logs.length).toBeGreaterThanOrEqual(2); // At least started and completed/failed
        expect(logs.some(log => log.status === 'started')).toBe(true);
        expect(logs.some(log => log.status === 'completed')).toBe(true);

        // Find the completion log entry
        const completionLog = logs.find(log => log.status === 'completed');
        expect(completionLog).toBeDefined();

        if (!completionLog) {
            throw new Error('Completion log not found');
        }

        // Verify validation results in log
        expect(completionLog.validationResults).toBeDefined();
        expect(completionLog.validationResults).toHaveLength(3);
        completionLog.validationResults.forEach((vr: { rule: any; success: boolean; message: string }) => {
            expect(vr).toHaveProperty('rule');
            expect(vr).toHaveProperty('success');
            expect(vr).toHaveProperty('message');
        });

        // Verify task results in log
        expect(completionLog.taskResults).toBeDefined();
        expect(completionLog.taskResults).toHaveLength(3);
        completionLog.taskResults.forEach((tr: { taskId: string; success: boolean; output: any }) => {
            expect(tr).toHaveProperty('taskId');
            expect(tr).toHaveProperty('success');
            expect(tr).toHaveProperty('output');
        });

        // Verify specific task results
        completionLog.taskResults.forEach((tr: { success: boolean; output: { statusCode: number; headers: any; data: { id: number } } }, index: number) => {
            expect(tr.success).toBe(true);
            expect(tr.output).toHaveProperty('statusCode', 200);
            expect(tr.output).toHaveProperty('headers');
            expect(tr.output).toHaveProperty('data');
            expect(tr.output.data).toHaveProperty('id', index + 1);
        });
    });
});

async function processLoanApplication(data: any, loggerOverride?: ILogger) {
    const logger = loggerOverride || new DefaultLogger();
    const workflowEngine = new WorkflowEngine(undefined, undefined, logger);
    return workflowEngine.execute(loanApprovalWorkflow, data);
} 