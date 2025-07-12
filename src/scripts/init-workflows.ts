import { MongoClient } from 'mongodb';
import { Workflow } from '../core/types/workflow';
import { TaskType, TaskMethod, TaskPriority, TaskRetryStrategy } from '../tasks/enums/task.enum';
import { ValidationOnFail } from '../core/enums/validation.enum';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DATABASE || 'workflow-engine';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'workflows_logs';

async function initWorkflows() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // Define workflows for different entities
        const workflows: Workflow[] = [
            // Loan form workflow
            {
                id: 'loan-form-workflow',
                name: 'Loan Form Workflow',
                trigger: 'DynamicFormUseCase.processForm.loan',
                validations: [
                    {
                        id: 'loan-amount-validation',
                        name: 'Loan Amount Validation',
                        condition: 'data.loanAmount > 0 && data.loanAmount <= 1000000',
                        message: 'Loan amount must be between 1 and 1,000,000',
                        onFail: ValidationOnFail.STOP
                    },
                    {
                        id: 'income-validation',
                        name: 'Income Validation',
                        condition: 'data.annualIncome >= 30000',
                        message: 'Annual income must be at least 30,000',
                        onFail: ValidationOnFail.STOP
                    },
                    {
                        id: 'employment-validation',
                        name: 'Employment Validation',
                        condition: 'data.employmentStatus === "employed"',
                        message: 'Applicant must be employed',
                        onFail: ValidationOnFail.STOP
                    }
                ],
                tasks: [
                    {
                        id: 'credit-check',
                        name: 'Credit Score Check',
                        type: TaskType.API_CALL,
                        order: 1,
                        config: {
                            url: 'https://jsonplaceholder.typicode.com/posts/1',
                            method: TaskMethod.GET,
                            timeout: 5000,
                            retries: 3,
                            retryStrategy: TaskRetryStrategy.EXPONENTIAL,
                            priority: TaskPriority.HIGH
                        }
                    },
                    {
                        id: 'risk-assessment',
                        name: 'Risk Assessment',
                        type: TaskType.API_CALL,
                        order: 2,
                        config: {
                            url: 'https://jsonplaceholder.typicode.com/posts',
                            method: TaskMethod.POST,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: {
                                loanAmount: '${data.loanAmount}',
                                annualIncome: '${data.annualIncome}',
                                creditScore: '${credit-check.result.id}'
                            },
                            timeout: 5000,
                            retries: 2,
                            priority: TaskPriority.MEDIUM
                        }
                    }
                ]
            },
            // Insurance form workflow
            {
                id: 'insurance-form-workflow',
                name: 'Insurance Form Workflow',
                trigger: 'DynamicFormUseCase.processForm.insurance',
                validations: [
                    {
                        id: 'age-validation',
                        name: 'Age Validation',
                        condition: 'data.age >= 18 && data.age <= 65',
                        message: 'Age must be between 18 and 65',
                        onFail: ValidationOnFail.STOP
                    },
                    {
                        id: 'coverage-validation',
                        name: 'Coverage Type Validation',
                        condition: '["health", "life", "auto"].includes(data.coverageType)',
                        message: 'Invalid coverage type',
                        onFail: ValidationOnFail.STOP
                    }
                ],
                tasks: [
                    {
                        id: 'medical-check',
                        name: 'Medical History Check',
                        type: TaskType.API_CALL,
                        order: 1,
                        config: {
                            url: 'https://jsonplaceholder.typicode.com/posts/2',
                            method: TaskMethod.GET,
                            timeout: 5000,
                            retries: 3,
                            priority: TaskPriority.HIGH
                        }
                    },
                    {
                        id: 'premium-calculation',
                        name: 'Premium Calculation',
                        type: TaskType.API_CALL,
                        order: 2,
                        config: {
                            url: 'https://jsonplaceholder.typicode.com/posts',
                            method: TaskMethod.POST,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: {
                                coverageType: '${data.coverageType}',
                                age: '${data.age}',
                                medicalHistory: '${medical-check.result.id}'
                            },
                            timeout: 5000,
                            retries: 2,
                            priority: TaskPriority.MEDIUM
                        }
                    }
                ]
            },
            // Mortgage form workflow
            {
                id: 'mortgage-form-workflow',
                name: 'Mortgage Form Workflow',
                trigger: 'DynamicFormUseCase.processForm.mortgage',
                validations: [
                    {
                        id: 'property-value-validation',
                        name: 'Property Value Validation',
                        condition: 'data.propertyValue >= 50000 && data.propertyValue <= 2000000',
                        message: 'Property value must be between 50,000 and 2,000,000',
                        onFail: ValidationOnFail.STOP
                    },
                    {
                        id: 'down-payment-validation',
                        name: 'Down Payment Validation',
                        condition: 'data.downPayment >= data.propertyValue * 0.2',
                        message: 'Down payment must be at least 20% of property value',
                        onFail: ValidationOnFail.STOP
                    },
                    {
                        id: 'credit-score-validation',
                        name: 'Credit Score Validation',
                        condition: 'data.creditScore >= 620',
                        message: 'Credit score must be at least 620',
                        onFail: ValidationOnFail.STOP
                    }
                ],
                tasks: [
                    {
                        id: 'property-verification',
                        name: 'Property Verification',
                        type: TaskType.API_CALL,
                        order: 1,
                        config: {
                            url: 'https://jsonplaceholder.typicode.com/posts/3',
                            method: TaskMethod.GET,
                            timeout: 5000,
                            retries: 3,
                            priority: TaskPriority.HIGH
                        }
                    },
                    {
                        id: 'mortgage-calculation',
                        name: 'Mortgage Terms Calculation',
                        type: TaskType.API_CALL,
                        order: 2,
                        config: {
                            url: 'https://jsonplaceholder.typicode.com/posts',
                            method: TaskMethod.POST,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: {
                                propertyValue: '${data.propertyValue}',
                                downPayment: '${data.downPayment}',
                                creditScore: '${data.creditScore}',
                                propertyVerification: '${property-verification.result.id}'
                            },
                            timeout: 5000,
                            retries: 2,
                            priority: TaskPriority.MEDIUM
                        }
                    }
                ]
            },
            // Sequential tasks workflow
            {
                id: 'sequential-tasks-workflow',
                name: 'Sequential Tasks Workflow',
                trigger: 'SequentialTasksUseCase.processTransaction',
                validations: [
                    {
                        id: 'amount-validation',
                        name: 'Amount Validation',
                        condition: 'data.initialAmount > 0',
                        message: 'Initial amount must be greater than 0',
                        onFail: ValidationOnFail.STOP
                    },
                    {
                        id: 'currency-validation',
                        name: 'Currency Validation',
                        condition: '["USD", "EUR", "GBP"].includes(data.currency)',
                        message: 'Currency must be USD, EUR, or GBP',
                        onFail: ValidationOnFail.STOP
                    }
                ],
                tasks: [
                    {
                        id: 'calculatefee',
                        name: 'Calculate Transaction Fee',
                        type: TaskType.API_CALL,
                        order: 1,
                        config: {
                            url: 'https://6821e583b342dce8004c404f.mockapi.io/api/catura-mock/fee/1',
                            method: TaskMethod.GET,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            timeout: 5000,
                            retries: 2,
                            priority: TaskPriority.HIGH
                        }
                    },
                    {
                        id: 'processpayment',
                        name: 'Process Payment',
                        type: TaskType.API_CALL,
                        order: 2,
                        config: {
                            url: 'https://6821e583b342dce8004c404f.mockapi.io/api/catura-mock/payment',
                            method: TaskMethod.POST,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: {
                                userName: '${userName}',
                                amount: '${initialAmount}',
                                fee: '${calculatefee.data.fee}',
                                totalAmount: '${parseFloat(initialAmount) + parseFloat(calculatefee.data.fee)}'
                            },
                            timeout: 5000,
                            retries: 2,
                            priority: TaskPriority.HIGH
                        }
                    }
                ]
            }
        ];

        // Insert all workflows
        for (const workflow of workflows) {
            await collection.updateOne(
                { id: workflow.id },
                { $set: workflow },
                { upsert: true }
            );
            console.log(`Workflow "${workflow.name}" initialized successfully`);
        }

        console.log('All workflows initialized successfully');
    } catch (error) {
        console.error('Error initializing workflows:', error);
        throw error;
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run the initialization
initWorkflows().catch(console.error); 