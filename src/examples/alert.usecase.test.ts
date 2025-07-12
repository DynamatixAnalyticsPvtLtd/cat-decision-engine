import { processLoanForm, processInsuranceForm, processMortgageForm } from './dynamic-form.client';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { FetchApplicationsUseCase } from './alert.usecase';
import { AlertRepository } from '../features/alert/repositories/alert.repository';
import { setContext } from "@dynamatix/cat-shared";

dotenv.config();

jest.setTimeout(50000);

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DATABASE || 'workflow-engine';
const LOGS_COLLECTION = process.env.MONGODB_COLLECTION || 'workflow_logs';

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

    describe('Alert Use Case', () => {
        beforeEach(async () => {
            // Skip cleanup due to MongoDB permissions - logs will accumulate but test should still work
            console.log('Skipping log cleanup due to MongoDB permissions');
        });

        it('should raise alert successfully', async () => {
            // Record start time before triggering workflow
            const startTime = new Date();
            setContext({
                contextId: "68726f0089d347a0db559dd8"
            });
            // Trigger the workflow
            await new FetchApplicationsUseCase().runWorkflow();

            // Wait for logs to be written and verify workflow execution
            let logs: any[] = [];
            for (let i = 0; i < 10; i++) {
                logs = await logsCollection.find({
                    workflowId: 'last-name-check',
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
            expect(completedLog?.workflowId).toBe('last-name-check');
            expect(completedLog?.taskResults).toBeDefined();
            expect(completedLog?.taskResults.length).toBeGreaterThan(0);
            // Check in workflow alert collection if alert is raised
            const alert = await new AlertRepository().findBySourceAndSourceId('last-name-check', "68726f0089d347a0db559dd8")[0];
            expect(alert).toBeDefined();
            expect(alert?.contextId).toBe('123');
            expect(alert?.alertMessage).toBe('Last name check failed');
            expect(alert?.status).toBe('raised');
            expect(alert?.formName).toBe(['loan-form']);
            expect(alert?.category).toBe('last-name-check');
        });
    });
}); 