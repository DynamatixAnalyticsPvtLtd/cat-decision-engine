import { WorkflowEngine } from './workflow-engine';
import { Workflow, ValidationRule, Task, WorkflowContext } from './types';
import { ValidationType, ValidationOperator, ValidationOnFail } from './enums/validation.enum';
import { TaskType, TaskMethod } from '../tasks/enums/task.enum';
import { TaskError } from './errors/workflow-error';
import { TaskExecutor } from './executors/task-executor';

describe('WorkflowEngine Error Handling', () => {
    let workflowEngine: WorkflowEngine;
    let taskExecutor: TaskExecutor;

    beforeEach(() => {
        taskExecutor = new TaskExecutor();
        workflowEngine = new WorkflowEngine(undefined, taskExecutor);
    });

    describe('executeWorkflow', () => {
        it('should throw error when workflow is not provided', async () => {
            const workflow = null as unknown as Workflow;
            const context: WorkflowContext = {};

            await expect(workflowEngine.executeWorkflow(workflow, context))
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

            const context: WorkflowContext = { age: 'invalid' };

            const result = await workflowEngine.executeWorkflow(workflow, context);

            expect(result).toEqual({
                success: false,
                context,
                validationResults: [{
                    rule: validationRule,
                    success: false,
                    error: 'Invalid type for age: expected number, got string'
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

            const context: WorkflowContext = { data: {} };

            // Mock task executor to throw error
            jest.spyOn(taskExecutor, 'executeTask').mockImplementationOnce(async () => ({
                task,
                taskId: task.id,
                success: false,
                error: 'Network error'
            }));

            const result = await workflowEngine.executeWorkflow(workflow, context);

            expect(result).toEqual({
                success: false,
                context,
                validationResults: [],
                taskResults: [{
                    task,
                    taskId: task.id,
                    success: false,
                    error: 'Network error'
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

            const context: WorkflowContext = { data: {} };

            const result = await workflowEngine.executeWorkflow(workflow, context);

            expect(result).toEqual({
                success: true,
                context,
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

            const context: WorkflowContext = { data: {} };

            const result = await workflowEngine.executeWorkflow(workflow, context);

            expect(result).toEqual({
                success: false,
                context,
                validationResults: [],
                taskResults: [{
                    task,
                    taskId: task.id,
                    success: false,
                    error: `Unsupported task type: invalid_type`
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

            const context: WorkflowContext = { data: {} };

            const result = await workflowEngine.executeWorkflow(workflow, context);

            expect(result).toEqual({
                success: false,
                context,
                validationResults: [],
                taskResults: [{
                    task,
                    taskId: task.id,
                    success: false,
                    error: 'URL is required for API task'
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

            const context: WorkflowContext = { data: {} };

            // Mock task executor to simulate timeout
            jest.spyOn(taskExecutor, 'executeTask').mockImplementationOnce(async () => ({
                task,
                taskId: task.id,
                success: false,
                error: 'Request timeout after 1000ms'
            }));

            const result = await workflowEngine.executeWorkflow(workflow, context);

            expect(result).toEqual({
                success: false,
                context,
                validationResults: [],
                taskResults: [{
                    task,
                    taskId: task.id,
                    success: false,
                    error: 'Request timeout after 1000ms'
                }]
            });
        });
    });
});