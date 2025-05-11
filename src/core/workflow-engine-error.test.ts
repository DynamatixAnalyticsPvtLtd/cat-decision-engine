import { WorkflowEngine } from './workflow-engine';
import { Workflow, ValidationRule, Task, WorkflowContext } from './types';
import { ValidationType, ValidationOperator, ValidationOnFail } from './enums/validation.enum';
import { TaskType, TaskMethod } from '../tasks/enums/task.enum';
import { TaskError } from './errors/workflow-error';
import { TaskExecutor } from './executors/task-executor';
import { DefaultLogger } from './logging/default-logger';

describe('WorkflowEngine Error Handling', () => {
    let workflowEngine: WorkflowEngine;
    let taskExecutor: TaskExecutor;
    let logger: DefaultLogger;

    beforeEach(() => {
        logger = new DefaultLogger();
        taskExecutor = new TaskExecutor(logger);
        workflowEngine = new WorkflowEngine(undefined, taskExecutor, logger);
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

            const data = { age: 'invalid' };

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

            // Mock task executor to throw error
            jest.spyOn(taskExecutor, 'executeTask').mockImplementationOnce(async () => ({
                task,
                taskId: task.id,
                success: false,
                error: 'Network error',
                metadata: { contextData: data }
            }));

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
                }]
            });
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
                }]
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

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: false,
                context: { data },
                validationResults: [],
                taskResults: [{
                    task,
                    taskId: task.id,
                    success: false,
                    error: 'URL is required for API task',
                    metadata: { contextData: data }
                }]
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

            // Mock task executor to simulate timeout
            jest.spyOn(taskExecutor, 'executeTask').mockImplementationOnce(async () => ({
                task,
                taskId: task.id,
                success: false,
                error: 'timeout of 1000ms exceeded',
                metadata: { contextData: data }
            }));

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
                }]
            });
        });
    });
});