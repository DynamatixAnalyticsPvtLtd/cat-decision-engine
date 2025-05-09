import { WorkflowEngine } from './workflow-engine';
import { Workflow, ValidationRule, WorkflowContext } from './types';
import { ValidationType, ValidationOperator, ValidationOnFail } from './enums/validation.enum';

describe.only('WorkflowEngine Validation', () => {
    let workflowEngine: WorkflowEngine;

    beforeEach(() => {
        workflowEngine = new WorkflowEngine();
    });

    describe('executeWorkflow', () => {
        it('should execute workflow with single validation successfully', async () => {
            const validationRule: ValidationRule = {
                name: 'age-validation',
                condition: 'age >= 18',
                onFail: ValidationOnFail.STOP
            };

            const workflow: Workflow = {
                id: 'test-workflow-1',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [validationRule],
                tasks: []
            };

            const context: WorkflowContext = { age: 20 };

            const result = await workflowEngine.executeWorkflow(workflow, context);

            expect(result).toEqual({
                success: true,
                context,
                validationResults: [{
                    rule: validationRule,
                    success: true
                }],
                taskResults: []
            });
        });

        it('should execute workflow with multiple validations in sequence', async () => {
            const validationRule1: ValidationRule = {
                name: 'age-validation',
                condition: 'age >= 18',
                onFail: ValidationOnFail.STOP
            };

            const validationRule2: ValidationRule = {
                name: 'score-validation',
                condition: 'score >= 60',
                onFail: ValidationOnFail.STOP
            };

            const workflow: Workflow = {
                id: 'test-workflow-2',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [validationRule1, validationRule2],
                tasks: []
            };

            const context: WorkflowContext = {
                age: 20,
                score: 75
            };

            const result = await workflowEngine.executeWorkflow(workflow, context);

            expect(result).toEqual({
                success: true,
                context,
                validationResults: [
                    {
                        rule: validationRule1,
                        success: true
                    },
                    {
                        rule: validationRule2,
                        success: true
                    }
                ],
                taskResults: []
            });
        });

        it('should stop execution when validation fails with stop on fail', async () => {
            const validationRule: ValidationRule = {
                name: 'age-validation',
                condition: 'age >= 18',
                onFail: ValidationOnFail.STOP
            };

            const workflow: Workflow = {
                id: 'test-workflow-3',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [validationRule],
                tasks: []
            };

            const context: WorkflowContext = { age: 16 };

            const result = await workflowEngine.executeWorkflow(workflow, context);

            expect(result).toEqual({
                success: false,
                context,
                validationResults: [{
                    rule: validationRule,
                    success: false,
                    error: 'Validation failed: age >= 18'
                }],
                taskResults: []
            });
        });

        it('should continue execution when validation fails with continue on fail', async () => {
            const validationRule: ValidationRule = {
                name: 'age-validation',
                condition: 'age >= 18',
                onFail: ValidationOnFail.CONTINUE
            };

            const workflow: Workflow = {
                id: 'test-workflow-4',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [validationRule],
                tasks: []
            };

            const context: WorkflowContext = { age: 16 };

            const result = await workflowEngine.executeWorkflow(workflow, context);

            expect(result).toEqual({
                success: true,
                context,
                validationResults: [{
                    rule: validationRule,
                    success: false,
                    error: 'Validation failed: age >= 18'
                }],
                taskResults: []
            });
        });
    });
}); 