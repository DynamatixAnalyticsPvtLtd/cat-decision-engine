import { WorkflowEngine } from './workflow-engine';
import { Workflow, ValidationRule } from './types';
import { ValidationType, ValidationOperator, ValidationOnFail } from './enums/validation.enum';
import { TaskExecutor } from './executors/task-executor';
import { DefaultLogger } from './logging/default-logger';

describe('WorkflowEngine Validation', () => {
    let workflowEngine: WorkflowEngine;
    let taskExecutor: TaskExecutor;
    let logger: DefaultLogger;

    beforeEach(() => {
        logger = new DefaultLogger();
        taskExecutor = new TaskExecutor(logger);
        workflowEngine = new WorkflowEngine();
    });

    describe('execute', () => {
        it('should execute single validation successfully', async () => {
            const validationRule: ValidationRule = {
                name: 'age-validation',
                condition: 'age >= 18',
                onFail: ValidationOnFail.STOP
            };

            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [validationRule],
                tasks: []
            };

            const data = { age: 20 };

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: true,
                context: { data },
                validationResults: [{
                    rule: validationRule,
                    success: true
                }],
                taskResults: []
            });
        });

        it('should execute multiple validations in order', async () => {
            const validationRules: ValidationRule[] = [
                {
                    name: 'age-validation',
                    condition: 'age >= 18',
                    onFail: ValidationOnFail.STOP
                },
                {
                    name: 'name-validation',
                    condition: 'name.length > 0',
                    onFail: ValidationOnFail.STOP
                }
            ];

            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: validationRules,
                tasks: []
            };

            const data = { age: 20, name: 'John' };

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: true,
                context: { data },
                validationResults: [
                    {
                        rule: validationRules[0],
                        success: true
                    },
                    {
                        rule: validationRules[1],
                        success: true
                    }
                ],
                taskResults: []
            });
        });

        it('should stop execution on validation failure', async () => {
            const validationRule: ValidationRule = {
                name: 'age-validation',
                condition: 'age >= 18',
                onFail: ValidationOnFail.STOP
            };

            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [validationRule],
                tasks: []
            };

            const data = { age: 16 };

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: false,
                context: { data },
                validationResults: [{
                    rule: validationRule,
                    success: false,
                    error: 'Validation failed: age >= 18'
                }],
                taskResults: []
            });
        });

        it('should continue execution on validation failure when configured', async () => {
            const validationRule: ValidationRule = {
                name: 'age-validation',
                condition: 'age >= 18',
                onFail: ValidationOnFail.CONTINUE
            };

            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [validationRule],
                tasks: []
            };

            const data = { age: 16 };

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: true,
                context: { data },
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