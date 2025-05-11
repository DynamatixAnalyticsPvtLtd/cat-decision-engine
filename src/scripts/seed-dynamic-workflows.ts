import { MongoClient } from 'mongodb';
import { Workflow } from '../core/types/workflow';
import { TaskType, TaskMethod } from '../core/enums/task.enum';
import { ValidationOnFail } from '../core/enums/validation.enum';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'workflow-engine';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'workflows';

async function seedWorkflows() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // Define workflows for each form type
        const workflows: Workflow[] = [
            // Loan Application Workflow
            {
                id: 'loan-application-workflow',
                name: 'Loan Application Processing',
                trigger: 'DynamicFormUseCase.processForm.loan',
                validations: [
                    {
                        id: 'loan-amount-validation',
                        name: 'loan-amount-validation',
                        condition: 'data.loanAmount > 0 && data.loanAmount <= 1000000',
                        message: 'Loan amount must be between 1 and 1,000,000',
                        onFail: ValidationOnFail.STOP
                    },
                    {
                        id: 'income-validation',
                        name: 'income-validation',
                        condition: 'data.annualIncome >= 30000',
                        message: 'Annual income must be at least 30,000',
                        onFail: ValidationOnFail.STOP
                    },
                    {
                        id: 'employment-validation',
                        name: 'employment-validation',
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
                            body: {
                                applicantName: '${data.applicantName}'
                            },
                            timeout: 5000,
                            retries: 3
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
                            body: {
                                loanAmount: '${data.loanAmount}',
                                annualIncome: '${data.annualIncome}',
                                creditScore: '${credit-check.result.score}'
                            }
                        }
                    }
                ]
            },

            // Insurance Application Workflow
            {
                id: 'insurance-application-workflow',
                name: 'Insurance Application Processing',
                trigger: 'DynamicFormUseCase.processForm.insurance',
                validations: [
                    {
                        id: 'age-validation',
                        name: 'age-validation',
                        condition: 'data.age >= 18 && data.age <= 65',
                        message: 'Age must be between 18 and 65',
                        onFail: ValidationOnFail.STOP
                    },
                    {
                        id: 'coverage-validation',
                        name: 'coverage-validation',
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
                            body: {
                                policyHolder: '${data.policyHolder}',
                                age: '${data.age}'
                            }
                        }
                    },
                    {
                        id: 'premium-calculation',
                        name: 'Premium Calculation',
                        type: TaskType.API_CALL,
                        order: 2,
                        config: {
                            url: 'https://api.insurance.com/calculate-premium',
                            method: TaskMethod.POST,
                            body: {
                                coverageType: '${data.coverageType}',
                                age: '${data.age}',
                                preExistingConditions: '${data.preExistingConditions}',
                                medicalHistory: '${medical-check.result.history}'
                            }
                        }
                    }
                ]
            },

            // Mortgage Application Workflow
            {
                id: 'mortgage-application-workflow',
                name: 'Mortgage Application Processing',
                trigger: 'DynamicFormUseCase.processForm.mortgage',
                validations: [
                    {
                        id: 'property-value-validation',
                        name: 'property-value-validation',
                        condition: 'data.propertyValue >= 50000 && data.propertyValue <= 2000000',
                        message: 'Property value must be between 50,000 and 2,000,000',
                        onFail: ValidationOnFail.STOP
                    },
                    {
                        id: 'down-payment-validation',
                        name: 'down-payment-validation',
                        condition: 'data.downPayment >= data.propertyValue * 0.2',
                        message: 'Down payment must be at least 20% of property value',
                        onFail: ValidationOnFail.STOP
                    },
                    {
                        id: 'credit-score-validation',
                        name: 'credit-score-validation',
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
                            body: {
                                propertyValue: '${data.propertyValue}',
                                downPayment: '${data.downPayment}'
                            }
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
                            body: {
                                propertyValue: '${data.propertyValue}',
                                downPayment: '${data.downPayment}',
                                creditScore: '${data.creditScore}'
                            }
                        }
                    }
                ]
            }
        ];

        // Insert or update workflows
        for (const workflow of workflows) {
            await collection.updateOne(
                { id: workflow.id },
                { $set: workflow },
                { upsert: true }
            );
            console.log(`Workflow "${workflow.name}" seeded successfully`);
        }

        console.log('All workflows seeded successfully');

    } catch (error) {
        console.error('Error seeding workflows:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run the seeding function
seedWorkflows().catch(console.error); 