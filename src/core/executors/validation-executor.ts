import { ValidationRule } from '../types/validation-rule';
import { ValidationResult, ValidationResultItem } from '../types/validation-result';
import { MongoLogger } from '../logging/mongo-logger';
import { ILogger } from 'core/logging/logger.interface';

export class ValidationExecutor {
    private logger: ILogger;

    constructor(logger?: ILogger) {
        this.logger = logger || new MongoLogger();
    }

    async execute(rules: ValidationRule[], data: any): Promise<ValidationResult> {
        const results: ValidationResultItem[] = [];
        let success = true;

        for (const rule of rules) {
            try {
                const isValid = await this.evaluateCondition(rule.condition, data);
                if (!isValid) {
                    success = false;
                    await this.logger.error('Validation failed', {
                        rule,
                        data,
                        status: 'failed',
                        message: rule.message
                    });
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
                await this.logger.error('Validation error', { rule, error });
            }
        }

        return {
            success,
            validationResults: results
        };
    }

    private async evaluateCondition(condition: string, data: any): Promise<boolean> {
        try {
            // Create a function from the condition string using only 'data'
            const fn = new Function('data', `return ${condition}`);
            const result = fn(data);
            return typeof result === 'boolean' ? result : false;
        } catch (error) {
            await this.logger.error('Error evaluating condition', { condition, error });
            throw error;
        }
    }
} 