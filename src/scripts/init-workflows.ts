import { MongoClient } from 'mongodb';
import { Workflow } from '../core/types/workflow';
import { TaskType, TaskMethod, TaskPriority, TaskRetryStrategy } from '../core/enums/task.enum';
import dotenv from 'dotenv';
import { ValidationOnFail } from 'core/enums/validation.enum';
// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'workflow-engine';
const COLLECTION_NAME = 'workflows';

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
                            url: 'https://api.credit-check.com/score',
                            method: TaskMethod.GET,
                            headers: {
                                'Authorization': 'Bearer ${CREDIT_CHECK_API_KEY}'
                            },
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
                            url: 'https://api.risk-assessment.com/calculate',
                            method: TaskMethod.POST,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: {
                                loanAmount: '${data.loanAmount}',
                                annualIncome: '${data.annualIncome}',
                                creditScore: '${credit-check.result.score}'
                            },
                            timeout: 5000,
                            retries: 2,
                            priority: TaskPriority.MEDIUM
                        }
                    },
                    {
                        id: 'loan-approval',
                        name: 'Loan Approval Decision',
                        type: TaskType.CONDITIONAL,
                        order: 3,
                        config: {
                            condition: 'risk-assessment.result.riskScore < 0.7',
                            onTrue: [
                                {
                                    id: 'send-approval-email',
                                    name: 'Send Approval Email',
                                    type: TaskType.EMAIL_SEND,
                                    order: 1,
                                    config: {
                                        to: ['${data.email}'],
                                        subject: 'Loan Application Approved',
                                        body: 'Your loan application has been approved.',
                                        timeout: 3000
                                    }
                                }
                            ],
                            onFalse: [
                                {
                                    id: 'send-rejection-email',
                                    name: 'Send Rejection Email',
                                    type: TaskType.EMAIL_SEND,
                                    order: 1,
                                    config: {
                                        to: ['${data.email}'],
                                        subject: 'Loan Application Status',
                                        body: 'Your loan application requires further review.',
                                        timeout: 3000
                                    }
                                }
                            ]
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
                            url: 'https://api.medical-records.com/history',
                            method: TaskMethod.GET,
                            headers: {
                                'Authorization': 'Bearer ${MEDICAL_API_KEY}'
                            },
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
                            url: 'https://api.insurance-premium.com/calculate',
                            method: TaskMethod.POST,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: {
                                coverageType: '${data.coverageType}',
                                age: '${data.age}',
                                medicalHistory: '${medical-check.result.history}'
                            },
                            timeout: 5000,
                            retries: 2,
                            priority: TaskPriority.MEDIUM
                        }
                    },
                    {
                        id: 'policy-generation',
                        name: 'Policy Generation',
                        type: TaskType.CUSTOM_FUNCTION,
                        order: 3,
                        config: {
                            function: 'generatePolicy',
                            args: [
                                '${data.policyHolder}',
                                '${data.coverageType}',
                                '${premium-calculation.result.premium}'
                            ],
                            timeout: 3000
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
                            url: 'https://api.property-verification.com/check',
                            method: TaskMethod.GET,
                            headers: {
                                'Authorization': 'Bearer ${PROPERTY_API_KEY}'
                            },
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
                            url: 'https://api.mortgage.com/calculate-terms',
                            method: TaskMethod.POST,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: {
                                propertyValue: '${data.propertyValue}',
                                downPayment: '${data.downPayment}',
                                creditScore: '${data.creditScore}',
                                propertyVerification: '${property-verification.result}'
                            },
                            timeout: 5000,
                            retries: 2,
                            priority: TaskPriority.MEDIUM
                        }
                    },
                    {
                        id: 'document-generation',
                        name: 'Document Generation',
                        type: TaskType.FILE_OPERATION,
                        order: 3,
                        config: {
                            operation: 'write',
                            path: 'mortgages/${data.propertyValue}_${Date.now()}.pdf',
                            content: '${mortgage-calculation.result.terms}',
                            timeout: 3000
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