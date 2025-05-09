import { ValidationRule, ValidationResult, WorkflowContext } from '../types';
import { IValidationExecutor } from '../interfaces/validation-executor.interface';

export class ValidationExecutor implements IValidationExecutor {
    async executeValidation(rule: ValidationRule, context: WorkflowContext): Promise<ValidationResult> {
        try {
            const isValid = this.evaluateCondition(rule.condition, context);

            return {
                rule,
                success: isValid,
                ...(isValid ? {} : { error: `Validation failed: ${rule.condition}` })
            };
        } catch (error) {
            return {
                rule,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown validation error'
            };
        }
    }

    private evaluateCondition(condition: string, context: WorkflowContext): boolean {
        try {
            // Parse the condition into parts
            const parts = condition.split(' ');
            if (parts.length !== 3) {
                throw new Error(`Invalid condition format: ${condition}`);
            }

            const [field, operator, value] = parts;

            // Get the field value from context
            const fieldValue = context[field];

            // Check if field exists
            if (fieldValue === undefined) {
                throw new Error(`Field ${field} not found in context`);
            }

            // Check if operator is valid
            const validOperators = ['>=', '<=', '==', '!=', '>', '<'];
            if (!validOperators.includes(operator)) {
                throw new Error(`Invalid validation operator: ${operator}`);
            }

            // Convert values to numbers for numeric comparisons
            const numValue = Number(value);
            const numFieldValue = Number(fieldValue);

            // Check if values are valid numbers for numeric operators
            if (['>=', '<=', '>', '<'].includes(operator) && (isNaN(numValue) || isNaN(numFieldValue))) {
                throw new Error(`Invalid type for ${field}: expected number, got ${typeof fieldValue}`);
            }

            // Evaluate based on operator
            switch (operator) {
                case '>=':
                    return numFieldValue >= numValue;
                case '<=':
                    return numFieldValue <= numValue;
                case '==':
                    return fieldValue === value;
                case '!=':
                    return fieldValue !== value;
                case '>':
                    return numFieldValue > numValue;
                case '<':
                    return numFieldValue < numValue;
                default:
                    throw new Error(`Invalid validation operator: ${operator}`);
            }
        } catch (error) {
            throw error;
        }
    }
} 