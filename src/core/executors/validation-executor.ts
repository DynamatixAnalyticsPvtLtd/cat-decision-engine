import { ValidationRule } from '../types/validation-rule';
import { ValidationResult, ValidationResultItem } from '../types/validation-result';
import { MongoLogger } from '../logging/mongo-logger';
import { ILogger } from 'core/logging/logger.interface';
import { WorkflowContext } from '../types/workflow-context';
import { ValidationOnFail } from '../enums/validation.enum';

export class ValidationExecutor {
    private logger: ILogger;

    constructor(logger?: ILogger) {
        this.logger = logger || new MongoLogger();
    }

    async execute(rules: ValidationRule[], data: any, context: WorkflowContext): Promise<ValidationResult> {
        const results: ValidationResultItem[] = [];
        let shouldStop = false;

        for (const rule of rules) {
            try {
                const isValid = await this.evaluateCondition(rule.condition, data);
                if (!isValid) {
                    await this.logger.error('Validation failed', {
                        executionId: context.executionId,
                        workflowId: context.workflowId,
                        name: context.workflowName,
                        rule,
                        data,
                        status: 'failed',
                        message: rule.message
                    });

                    // If any validation fails with STOP, mark shouldStop as true
                    if (rule.onFail === ValidationOnFail.STOP) {
                        shouldStop = true;
                    }
                } else {
                    await this.logger.info('Validation passed', {
                        executionId: context.executionId,
                        workflowId: context.workflowId,
                        name: context.workflowName,
                        rule,
                        data,
                        status: 'passed'
                    });
                }
                results.push({
                    rule,
                    success: isValid,
                    message: isValid ? `${rule.name} validation passed successfully!` : rule.message
                });
            } catch (error) {
                results.push({
                    rule,
                    success: false,
                    message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
                await this.logger.error('Validation error', {
                    executionId: context.executionId,
                    workflowId: context.workflowId,
                    name: context.workflowName,
                    rule,
                    error
                });

                // If any validation error occurs with STOP, mark shouldStop as true
                if (rule.onFail === ValidationOnFail.STOP) {
                    shouldStop = true;
                }
            }
        }

        // Check if any validation failed with STOP
        const hasFailedValidation = results.some(result => !result.success);
        
        return {
            success: !shouldStop, // Only set success to false if we need to stop
            validationResults: results,
            shouldStop: shouldStop && hasFailedValidation // Only stop if there's a failed validation with STOP
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