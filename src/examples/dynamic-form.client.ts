import { DynamicFormUseCase } from './dynamic-form.usecase';

interface FormResponse {
    success: boolean;
    data?: {
        entityType: string;
        status: string;
        [key: string]: any;
    };
    error?: string;
}

export async function processLoanForm(testData?: any): Promise<FormResponse> {
    const loanData = testData || {
        applicantName: 'John Doe',
        loanAmount: 50000,
        employmentStatus: 'employed',
        annualIncome: 75000,
        email: 'john.doe@example.com'
    };

    if (loanData.loanAmount < 10000) {
        throw new Error('Loan amount must be at least $10,000');
    }

    return handleFormSubmission('loan', loanData);
}

export async function processInsuranceForm(testData?: any): Promise<FormResponse> {
    const insuranceData = testData || {
        policyHolder: 'Jane Smith',
        coverageType: 'health',
        age: 35,
        preExistingConditions: false,
        email: 'jane.smith@example.com'
    };

    if (!['health', 'life', 'auto'].includes(insuranceData.coverageType)) {
        throw new Error('Invalid coverage type');
    }

    return handleFormSubmission('insurance', insuranceData);
}

export async function processMortgageForm(testData?: any): Promise<FormResponse> {
    const mortgageData = testData || {
        propertyValue: 300000,
        downPayment: 60000,
        creditScore: 720,
        employmentHistory: '5 years',
        email: 'mortgage.buyer@example.com'
    };

    if (mortgageData.propertyValue < 100000) {
        throw new Error('Property value must be at least $100,000');
    }

    return handleFormSubmission('mortgage', mortgageData);
}

// Example of how to handle form submissions in an API endpoint
export async function handleFormSubmission(entityType: string, formData: any) {
    try {
        // Create form handler for the specific entity type
        const formHandler = new DynamicFormUseCase(entityType);

        // Process the form
        const result = await formHandler.processForm(formData);

        // The workflow engine result is already in the correct format
        return result;

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
} 