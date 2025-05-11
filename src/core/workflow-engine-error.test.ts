import { WorkflowEngine } from './workflow-engine';
import { Workflow, ValidationRule, Task, WorkflowContext } from './types';
import { ValidationType, ValidationOperator, ValidationOnFail } from './enums/validation.enum';
import { TaskType, TaskMethod } from '../tasks/enums/task.enum';
import { TaskError } from './errors/workflow-error';
import { TaskExecutor } from './executors/task-executor';
import { ValidationExecutor } from './executors/validation-executor';
import { ILogger } from './interfaces/logger.interface';

jest.mock('./executors/task-executor');
jest.mock('./executors/validation-executor');

describe('WorkflowEngine Error Handling', () => {
    let workflowEngine: WorkflowEngine;
    let taskExecutor: jest.Mocked<TaskExecutor>;
    let validationExecutor: jest.Mocked<ValidationExecutor>;
    let logger: jest.Mocked<ILogger>;

    beforeEach(() => {
        // Create a mock logger
        logger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        } as unknown as jest.Mocked<ILogger>;

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
        it('should throw error when workflow is not provided', async () => {
            const workflow = null as unknown as Workflow;
            const data = {};

            await expect(workflowEngine.execute(workflow, data))
                .rejects
                .toThrow('Workflow is required');
        });

        it('should handle validation errors gracefully', async () => {
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

            const data = { age: 'invalid' };

            validationExecutor.execute.mockResolvedValueOnce({
                success: false,
                validationResults: [{
                    rule: validationRule,
                    success: false,
                    message: 'Validation failed: age >= 18'
                }]
            });

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
        });

        it('should handle task errors gracefully', async () => {
            const task: Task = {
                id: 'task-1',
                type: TaskType.API_CALL,
                name: 'Test Task',
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.POST,
                    body: { data: 'test' }
                }
            };

            const workflow: Workflow = {
                id: 'test-workflow-2',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: [task]
            };

            const data = { test: 'value' };

            validationExecutor.execute.mockResolvedValueOnce({
                success: true,
                validationResults: []
            });

            taskExecutor.executeBatch.mockResolvedValueOnce([{
                task,
                taskId: task.id,
                success: false,
                error: 'Network error',
                metadata: { contextData: data }
            }]);

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: false,
                context: { data },
                validationResults: [],
                taskResults: [{
                    task,
                    taskId: task.id,
                    success: false,
                    error: 'Network error',
                    metadata: { contextData: data }
                }],
                error: 'Task execution failed'
            });
        });

        it('should handle unexpected errors', async () => {
            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: []
            };

            const data = { test: 'value' };

            validationExecutor.execute.mockRejectedValueOnce(new Error('Unexpected error'));

            await expect(workflowEngine.execute(workflow, data))
                .rejects
                .toThrow('Unexpected error');
        });
    });

    describe('error handling edge cases', () => {
        it('should handle empty workflow tasks array', async () => {
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

            taskExecutor.executeBatch.mockResolvedValueOnce([]);

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: true,
                context: { data },
                validationResults: [],
                taskResults: []
            });
        });

        it('should handle invalid task type', async () => {
            const task: Task = {
                id: 'task-1',
                type: 'invalid_type' as TaskType,
                name: 'Test Task',
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.GET
                }
            };

            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: [task]
            };

            const data = { test: 'value' };

            validationExecutor.execute.mockResolvedValueOnce({
                success: true,
                validationResults: []
            });

            taskExecutor.executeBatch.mockResolvedValueOnce([{
                task,
                taskId: task.id,
                success: false,
                error: `Unsupported task type: invalid_type`,
                metadata: { contextData: data }
            }]);

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: false,
                context: { data },
                validationResults: [],
                taskResults: [{
                    task,
                    taskId: task.id,
                    success: false,
                    error: `Unsupported task type: invalid_type`,
                    metadata: { contextData: data }
                }],
                error: 'Task execution failed'
            });
        });

        it('should handle task with missing required config', async () => {
            const task: Task = {
                id: 'task-1',
                type: TaskType.API_CALL,
                name: 'Test Task',
                order: 1,
                config: {
                    method: TaskMethod.GET
                    // Intentionally missing url
                } as any // Type assertion needed since we're testing missing required field
            };

            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: [task]
            };

            const data = { test: 'value' };

            validationExecutor.execute.mockResolvedValueOnce({
                success: true,
                validationResults: []
            });

            taskExecutor.executeBatch.mockResolvedValueOnce([{
                task,
                taskId: task.id,
                success: false,
                error: 'URL is required for API tasks',
                metadata: { contextData: data }
            }]);

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: false,
                context: { data },
                validationResults: [],
                taskResults: [{
                    task,
                    taskId: task.id,
                    success: false,
                    error: 'URL is required for API tasks',
                    metadata: { contextData: data }
                }],
                error: 'Task execution failed'
            });
        });

        it('should handle task execution timeout', async () => {
            const task: Task = {
                id: 'task-1',
                type: TaskType.API_CALL,
                name: 'Test Task',
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.POST,
                    body: { data: 'test' },
                    timeout: 1000
                }
            };

            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: [task]
            };

            const data = { test: 'value' };

            validationExecutor.execute.mockResolvedValueOnce({
                success: true,
                validationResults: []
            });

            taskExecutor.executeBatch.mockResolvedValueOnce([{
                task,
                taskId: task.id,
                success: false,
                error: 'timeout of 1000ms exceeded',
                metadata: { contextData: data }
            }]);

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: false,
                context: { data },
                validationResults: [],
                taskResults: [{
                    task,
                    taskId: task.id,
                    success: false,
                    error: 'timeout of 1000ms exceeded',
                    metadata: { contextData: data }
                }],
                error: 'Task execution failed'
            });
        });
    });
});