import { ValidationRule } from '../types/validation-rule';
import { ValidationResult, ValidationResultItem } from '../types/validation-result';
import { ILogger } from '../interfaces/logger.interface';

export class ValidationExecutor {
    private logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    async executeValidations(rules: ValidationRule[], data: any): Promise<ValidationResult> {
        const results: ValidationResultItem[] = [];
        let success = true;

        for (const rule of rules) {
            try {
                const isValid = await this.evaluateCondition(rule.condition, data);
                if (!isValid) {
                    success = false;
                    this.logger.warn('Validation failed', { rule, data });
                }
                results.push({
                    rule,
                    success: isValid,
                    message: isValid ? undefined : rule.message
                });
            } catch (error) {
                success = false;
                results.push({
                    rule,
                    success: false,
                    message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
                this.logger.error('Validation error', { rule, error });
            }
        }

        return {
            success,
            validationResults: results
        };
    }

    private async evaluateCondition(condition: string, data: any): Promise<boolean> {
        try {
            // Create a function from the condition string
            const fn = new Function('data', `return ${condition}`);
            const result = fn(data);
            return typeof result === 'boolean' ? result : false;
        } catch (error) {
            this.logger.error('Error evaluating condition', { condition, error });
            throw error;
        }
    }
} 