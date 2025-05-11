import { WorkflowEngine } from './workflow-engine';
import { Workflow, ValidationRule } from './types';
import { ValidationType, ValidationOperator, ValidationOnFail } from './enums/validation.enum';
import { TaskType, TaskMethod } from '../tasks/enums/task.enum';
import { TaskExecutor } from './executors/task-executor';
import { DefaultLogger } from './logging/default-logger';
import { ValidationExecutor } from './executors/validation-executor';

jest.mock('./executors/validation-executor');
jest.mock('./executors/task-executor');

describe('WorkflowEngine Validation', () => {
    let workflowEngine: WorkflowEngine;
    let taskExecutor: jest.Mocked<TaskExecutor>;
    let logger: DefaultLogger;
    let validationExecutor: jest.Mocked<ValidationExecutor>;

    beforeEach(() => {
        logger = new DefaultLogger();

        // Create proper jest mocks
        taskExecutor = {
            execute: jest.fn(),
            executeBatch: jest.fn()
        } as unknown as jest.Mocked<TaskExecutor>;

        validationExecutor = {
            execute: jest.fn()
        } as unknown as jest.Mocked<ValidationExecutor>;

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

            validationExecutor.execute.mockResolvedValueOnce({
                success: true,
                validationResults: [{
                    rule: validationRule,
                    success: true
                }]
            });

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

            validationExecutor.execute.mockResolvedValueOnce({
                success: true,
                validationResults: validationRules.map(rule => ({
                    rule,
                    success: true
                }))
            });

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: true,
                context: { data },
                validationResults: validationRules.map(rule => ({
                    rule,
                    success: true
                })),
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
                taskResults: [],
                error: 'Validation failed'
            });
            expect(validationExecutor.execute).toHaveBeenCalledWith([validationRule], data);
            expect(taskExecutor.executeBatch).not.toHaveBeenCalled();
        });

        it('should stop execution on validation failure even when configured to continue', async () => {
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
                success: false,
                context: { data },
                validationResults: [{
                    rule: validationRule,
                    success: false,
                    message: 'Validation failed: age >= 18'
                }],
                taskResults: [],
                error: 'Validation failed'
            });
            expect(validationExecutor.execute).toHaveBeenCalledWith([validationRule], data);
            expect(taskExecutor.executeBatch).not.toHaveBeenCalled();
        });

        it('should handle empty validation rules array', async () => {
            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: []
            };

            const data = { test: 'value' };

            validationExecutor.execute.mockResolvedValueOnce({
                success: true,
                validationResults: []
            });

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: true,
                context: { data },
                validationResults: [],
                taskResults: []
            });
            expect(validationExecutor.execute).toHaveBeenCalledWith([], data);
        });
    });
}); 