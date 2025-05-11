import { processLoanForm, processInsuranceForm, processMortgageForm } from './dynamic-form.client';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

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

    beforeEach(async () => {
        // Clear logs before each test
        await logsCollection.deleteMany({});
    });

    describe('Loan Form Processing', () => {
        it('should process loan form successfully with valid data and log success', async () => {
            const result = await processLoanForm();

            // Verify result
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.entityType).toBe('loan');
            expect(result.data?.status).toBe('PROCESSED');
            expect(result.data?.message).toBe('loan form processed successfully');
            expect(result.data?.applicantName).toBe('John Doe');
            expect(result.data?.loanAmount).toBe(50000);

            // Verify logs
            const logs = await logsCollection.find({ entityType: 'loan' }).toArray();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({
                entityType: 'loan',
                status: 'SUCCESS',
                workflowName: expect.any(String),
                executionTime: expect.any(Number)
            });
        });

        it('should log validation failure for invalid loan amount', async () => {
            // Test with invalid loan amount
            const invalidLoanData = {
                applicantName: 'John Doe',
                loanAmount: 5000, // Invalid amount
                employmentStatus: 'employed',
                annualIncome: 75000,
                email: 'john.doe@example.com'
            };

            const result = await processLoanForm(invalidLoanData);

            // Verify result
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Verify logs
            const logs = await logsCollection.find({ entityType: 'loan' }).toArray();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({
                entityType: 'loan',
                status: 'FAILURE',
                error: expect.any(String),
                workflowName: expect.any(String),
                executionTime: expect.any(Number)
            });
        });
    });

    describe('Insurance Form Processing', () => {
        it('should process insurance form successfully with valid data and log success', async () => {
            const result = await processInsuranceForm();

            // Verify result
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.entityType).toBe('insurance');
            expect(result.data?.status).toBe('PROCESSED');
            expect(result.data?.message).toBe('insurance form processed successfully');
            expect(result.data?.policyHolder).toBe('Jane Smith');
            expect(result.data?.coverageType).toBe('health');

            // Verify logs
            const logs = await logsCollection.find({ entityType: 'insurance' }).toArray();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({
                entityType: 'insurance',
                status: 'SUCCESS',
                workflowName: expect.any(String),
                executionTime: expect.any(Number)
            });
        });

        it('should log validation failure for invalid coverage type', async () => {
            // Test with invalid coverage type
            const invalidInsuranceData = {
                policyHolder: 'Jane Smith',
                coverageType: 'invalid', // Invalid coverage type
                age: 35,
                preExistingConditions: false,
                email: 'jane.smith@example.com'
            };

            const result = await processInsuranceForm(invalidInsuranceData);

            // Verify result
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Verify logs
            const logs = await logsCollection.find({ entityType: 'insurance' }).toArray();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({
                entityType: 'insurance',
                status: 'FAILURE',
                error: expect.any(String),
                workflowName: expect.any(String),
                executionTime: expect.any(Number)
            });
        });
    });

    describe('Mortgage Form Processing', () => {
        it('should process mortgage form successfully with valid data and log success', async () => {
            const result = await processMortgageForm();

            // Verify result
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.entityType).toBe('mortgage');
            expect(result.data?.status).toBe('PROCESSED');
            expect(result.data?.message).toBe('mortgage form processed successfully');
            expect(result.data?.propertyValue).toBe(300000);
            expect(result.data?.downPayment).toBe(60000);

            // Verify logs
            const logs = await logsCollection.find({ entityType: 'mortgage' }).toArray();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({
                entityType: 'mortgage',
                status: 'SUCCESS',
                workflowName: expect.any(String),
                executionTime: expect.any(Number)
            });
        });

        it('should log validation failure for invalid property value', async () => {
            // Test with invalid property value
            const invalidMortgageData = {
                propertyValue: 50000, // Invalid property value
                downPayment: 60000,
                creditScore: 720,
                employmentHistory: '5 years',
                email: 'mortgage.buyer@example.com'
            };

            const result = await processMortgageForm(invalidMortgageData);

            // Verify result
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // Verify logs
            const logs = await logsCollection.find({ entityType: 'mortgage' }).toArray();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({
                entityType: 'mortgage',
                status: 'FAILURE',
                error: expect.any(String),
                workflowName: expect.any(String),
                executionTime: expect.any(Number)
            });
        });
    });
}); 