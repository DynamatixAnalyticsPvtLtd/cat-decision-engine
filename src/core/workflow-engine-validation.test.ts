import { WorkflowEngine } from './workflow-engine';
import { Workflow, ValidationRule } from './types';
import { ValidationType, ValidationOperator, ValidationOnFail } from './enums/validation.enum';
import { TaskExecutor } from './executors/task-executor';
import { DefaultLogger } from './logging/default-logger';
import { ValidationExecutor } from './executors/validation-executor';

describe('WorkflowEngine Validation', () => {
    let workflowEngine: WorkflowEngine;
    let taskExecutor: TaskExecutor;
    let logger: DefaultLogger;
    let validationExecutor: jest.Mocked<ValidationExecutor>;

    beforeEach(() => {
        logger = new DefaultLogger();
        taskExecutor = new TaskExecutor(logger);
        validationExecutor = new ValidationExecutor(logger) as jest.Mocked<ValidationExecutor>;
        validationExecutor.execute = jest.fn().mockImplementation(async (rules: ValidationRule[], data: any) => ({
            success: true,
            validationResults: rules.map(rule => ({
                rule,
                success: true
            }))
        }));
        workflowEngine = new WorkflowEngine(validationExecutor, taskExecutor, logger);
    });

    describe('execute', () => {
        it('should execute single validation successfully', async () => {
            const validationRule: ValidationRule = {
                id: 'age-validation-1',
                name: 'age-validation',
                condition: 'age >= 18',
                message: 'Age must be at least 18',
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
            expect(validationExecutor.execute).toHaveBeenCalledWith([validationRule], data);
        });

        it('should execute multiple validations in order', async () => {
            const validationRules: ValidationRule[] = [
                {
                    id: 'age-validation-1',
                    name: 'age-validation',
                    condition: 'age >= 18',
                    message: 'Age must be at least 18',
                    onFail: ValidationOnFail.STOP
                },
                {
                    id: 'name-validation-1',
                    name: 'name-validation',
                    condition: 'name.length > 0',
                    message: 'Name must not be empty',
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
            expect(validationExecutor.execute).toHaveBeenCalledWith(validationRules, data);
        });

        it('should stop execution on validation failure', async () => {
            const validationRule: ValidationRule = {
                id: 'age-validation-1',
                name: 'age-validation',
                condition: 'age >= 18',
                message: 'Age must be at least 18',
                onFail: ValidationOnFail.STOP
            };

            validationExecutor.execute.mockResolvedValueOnce({
                success: false,
                validationResults: [{
                    rule: validationRule,
                    success: false,
                    message: 'Validation failed: age >= 18'
                }]
            });

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
                    message: 'Validation failed: age >= 18'
                }],
                taskResults: []
            });
            expect(validationExecutor.execute).toHaveBeenCalledWith([validationRule], data);
        });

        it('should continue execution on validation failure when configured', async () => {
            const validationRule: ValidationRule = {
                id: 'age-validation-1',
                name: 'age-validation',
                condition: 'age >= 18',
                message: 'Age must be at least 18',
                onFail: ValidationOnFail.CONTINUE
            };

            validationExecutor.execute.mockResolvedValueOnce({
                success: false,
                validationResults: [{
                    rule: validationRule,
                    success: false,
                    message: 'Validation failed: age >= 18'
                }]
            });

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
                    message: 'Validation failed: age >= 18'
                }],
                taskResults: []
            });
            expect(validationExecutor.execute).toHaveBeenCalledWith([validationRule], data);
        });
    });
}); 