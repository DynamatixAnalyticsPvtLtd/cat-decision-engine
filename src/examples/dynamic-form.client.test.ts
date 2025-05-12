import { processLoanForm, processInsuranceForm, processMortgageForm } from './dynamic-form.client';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

jest.setTimeout(50000);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'workflow-engine';
const LOGS_COLLECTION = 'workflow_logs';

describe('Dynamic Form Client Integration Tests', () => {
    let client: MongoClient;
    let logsCollection: any;

    beforeAll(async () => {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        logsCollection = db.collection(LOGS_COLLECTION);
    });

    afterAll(async () => {
        await client.close();
    });



    describe('Loan Form Processing', () => {
        beforeEach(async () => {
            // Clear logs for loan workflow before each test
            await logsCollection.deleteMany({ workflowId: 'loan-form-workflow' });
        });
        it('should process loan form successfully', async () => {
            // Record start time before triggering workflow
            const startTime = new Date();

            // Trigger the workflow
            await processLoanForm();

            // Wait for logs to be written and verify workflow execution
            let logs: any[] = [];
            for (let i = 0; i < 10; i++) {
                logs = await logsCollection.find({
                    workflowId: 'loan-form-workflow',
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
            expect(completedLog?.workflowId).toBe('loan-form-workflow');
            expect(completedLog?.taskResults).toBeDefined();
            expect(completedLog?.taskResults.length).toBeGreaterThan(0);
        });

        it('should log validation failure for invalid loan amount', async () => {
            // Record start time before triggering workflow
            const startTime = new Date();

            // Test with invalid loan amount
            const invalidLoanData = {
                applicantName: 'John Doe',
                loanAmount: 2000000, // Invalid amount
                employmentStatus: 'employed',
                annualIncome: 75000,
                email: 'john.doe@example.com'
            };

            await processLoanForm(invalidLoanData);

            // Wait for logs to be written and verify workflow execution
            let logs: any[] = [];
            for (let i = 0; i < 10; i++) {
                logs = await logsCollection.find({
                    workflowId: 'loan-form-workflow',
                    timestamp: { $gte: startTime }
                }).toArray();
                if (logs.some((log: any) => log.status === 'failed')) break;
                await new Promise(res => setTimeout(res, 1000));
            }

            console.log('Found logs:', JSON.stringify(logs, null, 2));

            // Verify workflow execution through logs
            expect(logs.length).toBeGreaterThanOrEqual(2); // At least started and failed
            expect(logs.some((log: any) => log.status === 'started')).toBe(true);
            expect(logs.some((log: any) => log.status === 'failed')).toBe(true);
        });
    });

    describe('Insurance Form Processing', () => {
        beforeEach(async () => {
            // Clear logs for insurance workflow before each test
            await logsCollection.deleteMany({ workflowId: 'insurance-form-workflow' });
        });

        it('should process insurance form successfully', async () => {
            // Record start time before triggering workflow
            const startTime = new Date();

            // Trigger the workflow
            await processInsuranceForm();

            // Wait for logs to be written and verify workflow execution
            let logs: any[] = [];
            for (let i = 0; i < 10; i++) {
                logs = await logsCollection.find({
                    workflowId: 'insurance-form-workflow',
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
            expect(completedLog?.workflowId).toBe('insurance-form-workflow');
            expect(completedLog?.taskResults).toBeDefined();
            expect(completedLog?.taskResults.length).toBeGreaterThan(0);
        });

        it('should log validation failure for invalid coverage type', async () => {
            // Record start time before triggering workflow
            const startTime = new Date();

            // Test with invalid coverage type
            const invalidInsuranceData = {
                policyHolder: 'Jane Smith',
                coverageType: 'invalid', // Invalid coverage type
                age: 35,
                preExistingConditions: false,
                email: 'jane.smith@example.com'
            };

            await processInsuranceForm(invalidInsuranceData);

            // Wait for logs to be written
            await new Promise(res => setTimeout(res, 1000));

            // Query logs for this workflow within the time window
            const logs = await logsCollection.find({
                workflowId: 'insurance-form-workflow',
                timestamp: { $gte: startTime }
            }).toArray();

            expect(logs.length).toBeGreaterThanOrEqual(2); // At least started and failed
            expect(logs.some((log: any) => log.status === 'started')).toBe(true);
            expect(logs.some((log: any) => log.status === 'failed')).toBe(true);
        });
    });

    describe('Mortgage Form Processing', () => {
        beforeEach(async () => {
            // Clear logs for mortgage workflow before each test
            await logsCollection.deleteMany({ workflowId: 'mortgage-form-workflow' });
        });

        it('should process mortgage form successfully', async () => {
            // Record start time before triggering workflow
            const startTime = new Date();

            // Trigger the workflow
            await processMortgageForm();

            // Wait for logs to be written and verify workflow execution
            let logs: any[] = [];
            for (let i = 0; i < 10; i++) {
                logs = await logsCollection.find({
                    workflowId: 'mortgage-form-workflow',
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
            expect(completedLog?.workflowId).toBe('mortgage-form-workflow');
            expect(completedLog?.taskResults).toBeDefined();
            expect(completedLog?.taskResults.length).toBeGreaterThan(0);
        });

        it('should log validation failure for invalid property value', async () => {
            // Record start time before triggering workflow
            const startTime = new Date();

            // Test with invalid property value
            const invalidMortgageData = {
                propertyValue: 2000010, // Invalid property value
                downPayment: 60000,
                creditScore: 720,
                employmentHistory: '5 years',
                email: 'mortgage.buyer@example.com'
            };

            await processMortgageForm(invalidMortgageData);

            // Wait for logs to be written
            await new Promise(res => setTimeout(res, 1000));

            // Query logs for this workflow within the time window
            const logs = await logsCollection.find({
                workflowId: 'mortgage-form-workflow',
                timestamp: { $gte: startTime }
            }).toArray();

            expect(logs.length).toBeGreaterThanOrEqual(2); // At least started and failed
            expect(logs.some((log: any) => log.status === 'started')).toBe(true);
            expect(logs.some((log: any) => log.status === 'failed')).toBe(true);
        });
    });
}); 