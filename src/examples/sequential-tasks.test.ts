import { MongoClient } from 'mongodb';
import { SequentialTasksUseCase } from './sequential-tasks.usecase';

jest.setTimeout(50000);

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DATABASE || 'workflow-engine';
const LOGS_COLLECTION = process.env.MONGODB_COLLECTION || 'workflow_logs';

describe('Sequential Tasks Integration Tests', () => {
    let client: MongoClient;
    let logsCollection: any;
    let useCase: SequentialTasksUseCase;

    beforeAll(async () => {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        logsCollection = db.collection(LOGS_COLLECTION);
        useCase = new SequentialTasksUseCase();
    });

    afterAll(async () => {
        await client.close();
    });

    beforeEach(async () => {
        // Clear logs before each test
        await logsCollection.deleteMany({ workflowId: 'sequential-tasks-workflow' });
    });

    it('should process transaction successfully', async () => {
        // Record start time before triggering workflow
        const startTime = new Date();

        // Test with valid transaction data
        const validTransactionData = {
            userName: '123',
            initialAmount: 1000,
            currency: 'USD'
        };

        // Process transaction
        const result = await useCase.processTransaction(validTransactionData);

        // Wait for logs to be written and verify workflow execution
        let logs: any[] = [];
        for (let i = 0; i < 10; i++) {
            logs = await logsCollection.find({
                workflowId: 'sequential-tasks-workflow',
                timestamp: { $gte: startTime }
            }).toArray();
            if (logs.some((log: any) => log.status === 'completed')) break;
            await new Promise(res => setTimeout(res, 1000));
        }

        // Verify workflow execution through logs
        expect(logs.length).toBeGreaterThanOrEqual(2); // At least started and completed
        expect(logs.some((log: any) => log.status === 'started')).toBe(true);
        expect(logs.some((log: any) => log.status === 'completed')).toBe(true);

        // Verify workflow execution details
        const completedLog = logs.find((log: any) => log.status === 'completed');
        expect(completedLog).toBeDefined();
        expect(completedLog?.workflowId).toBe('sequential-tasks-workflow');
        expect(completedLog?.taskResults).toBeDefined();
        expect(completedLog?.taskResults.length).toBe(2); // Should have 2 task results

        // Verify first task result
        const firstTaskResult = completedLog?.taskResults[0];
        expect(firstTaskResult).toBeDefined();
        expect(firstTaskResult?.taskId).toBe('calculatefee');
        expect(firstTaskResult?.success).toBe(true);
        expect(firstTaskResult?.output.data).toHaveProperty('fee');

        // Verify second task result
        const secondTaskResult = completedLog?.taskResults[1];
        expect(secondTaskResult).toBeDefined();
        expect(secondTaskResult?.taskId).toBe('processpayment');
        expect(secondTaskResult?.success).toBe(true);
        expect(secondTaskResult?.output.data).toHaveProperty('totalAmount');
        expect(secondTaskResult?.output.data.totalAmount).toBe(
            Number(validTransactionData.initialAmount) + Number(firstTaskResult?.output.data.fee)
        );
    });

    it('should fail when validation rules are not met', async () => {
        // Record start time before triggering workflow
        const startTime = new Date();

        // Test with invalid transaction data
        const invalidTransactionData = {
            userName: '123',
            initialAmount: -1000, // Invalid amount
            currency: 'USD'
        };

        // Process transaction
        const result = await useCase.processTransaction(invalidTransactionData);

        // Wait for logs to be written
        let logs: any[] = [];
        for (let i = 0; i < 10; i++) {
            logs = await logsCollection.find({
                workflowId: 'sequential-tasks-workflow',
                timestamp: { $gte: startTime }
            }).toArray();
            if (logs.some((log: any) => log.status === 'failed')) break;
            await new Promise(res => setTimeout(res, 1000));
        }

        // Verify workflow execution through logs
        expect(logs.length).toBeGreaterThanOrEqual(2); // At least started and failed
        expect(logs.some((log: any) => log.status === 'started')).toBe(true);
        expect(logs.some((log: any) => log.status === 'failed')).toBe(true);

        // Verify workflow execution details
        // Find the failed log with validationResults array (from WorkflowEngine)
        const failedLog = logs.find((log: any) => log.status === 'failed' && Array.isArray(log.validationResults) && log.validationResults.length > 0);
        expect(failedLog).toBeDefined();
        expect(failedLog?.workflowId).toBe('sequential-tasks-workflow');
        expect(failedLog?.taskResults).toBeDefined();
        expect(failedLog?.taskResults.length).toBe(0); // No tasks should be executed when validation fails

        // Verify validation failure
        expect(failedLog?.validationResults).toBeDefined();
        expect(failedLog?.validationResults.length).toBe(2);
        const failedValidation = failedLog?.validationResults.find((v: any) => !v.success);
        expect(failedValidation).toBeDefined();
        expect(failedValidation?.message).toBe('Initial amount must be greater than 0');
    });
}); 