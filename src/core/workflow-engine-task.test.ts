import { WorkflowEngine } from './workflow-engine';
import { Workflow } from './types/workflow';
import { WorkflowContext } from './types/workflow-context';
import { Task } from './types/task';
import { TaskType, TaskMethod } from '../tasks/enums/task.enum';
import { TaskExecutor } from './executors/task-executor';

describe('WorkflowEngine - Task Execution', () => {
    let workflowEngine: WorkflowEngine;
    let mockLogger: any;
    let taskExecutor: TaskExecutor;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };
        taskExecutor = new TaskExecutor();
        workflowEngine = new WorkflowEngine(undefined, taskExecutor, mockLogger);
    });

    it('should execute a single task successfully', async () => {
        const task: Task = {
            id: '1',
            type: TaskType.API_CALL,
            order: 1,
            config: {
                url: 'https://api.test.com',
                method: TaskMethod.POST,
                body: { data: 'test' }
            }
        };

        const workflow: Workflow = {
            id: '1',
            name: 'Test Workflow',
            tasks: [task],
            validations: []
        };

        const context: WorkflowContext = {
            data: { test: 'data' }
        };

        jest.spyOn(taskExecutor, 'executeTask').mockImplementationOnce(() => Promise.resolve({
            task,
            taskId: task.id,
            success: true,
            output: {
                statusCode: 200,
                headers: {},
                data: { result: 'success' }
            }
        }));

        const result = await workflowEngine.executeWorkflow(workflow, context);

        expect(result.success).toBe(true);
        expect(result.taskResults).toHaveLength(1);
        expect(result.taskResults[0].success).toBe(true);
        expect(result.taskResults[0].taskId).toBe('1');
    });

    it('should execute multiple tasks in order', async () => {
        const tasks: Task[] = [
            {
                id: '1',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com/1',
                    method: TaskMethod.POST,
                    body: { data: 'test1' }
                }
            },
            {
                id: '2',
                type: TaskType.API_CALL,
                order: 2,
                config: {
                    url: 'https://api.test.com/2',
                    method: TaskMethod.POST,
                    body: { data: 'test2' }
                }
            }
        ];

        const workflow: Workflow = {
            id: '1',
            name: 'Test Workflow',
            tasks,
            validations: []
        };

        const context: WorkflowContext = {
            data: { test: 'data' }
        };

        jest.spyOn(taskExecutor, 'executeTask')
            .mockImplementationOnce(() => Promise.resolve({
                task: tasks[0],
                taskId: tasks[0].id,
                success: true,
                output: {
                    statusCode: 200,
                    headers: {},
                    data: { result: 'success1' }
                }
            }))
            .mockImplementationOnce(() => Promise.resolve({
                task: tasks[1],
                taskId: tasks[1].id,
                success: true,
                output: {
                    statusCode: 200,
                    headers: {},
                    data: { result: 'success2' }
                }
            }));

        const result = await workflowEngine.executeWorkflow(workflow, context);

        expect(result.success).toBe(true);
        expect(result.taskResults).toHaveLength(2);
        expect(result.taskResults[0].success).toBe(true);
        expect(result.taskResults[0].taskId).toBe('1');
        expect(result.taskResults[1].success).toBe(true);
        expect(result.taskResults[1].taskId).toBe('2');
    });

    it('should handle task execution failure', async () => {
        const task: Task = {
            id: '1',
            type: TaskType.API_CALL,
            order: 1,
            config: {
                url: 'https://api.test.com',
                method: TaskMethod.POST,
                body: { data: 'test' }
            }
        };

        const workflow: Workflow = {
            id: '1',
            name: 'Test Workflow',
            tasks: [task],
            validations: []
        };

        const context: WorkflowContext = {
            data: { test: 'data' }
        };

        jest.spyOn(taskExecutor, 'executeTask').mockImplementationOnce(() => Promise.resolve({
            task,
            taskId: task.id,
            success: false,
            error: 'Task execution failed'
        }));

        const result = await workflowEngine.executeWorkflow(workflow, context);

        expect(result.success).toBe(false);
        expect(result.taskResults).toHaveLength(1);
        expect(result.taskResults[0].success).toBe(false);
        expect(result.taskResults[0].error).toBe('Task execution failed');
    });

    it('should validate task configuration before execution', async () => {
        const task: Task = {
            id: '1',
            type: TaskType.API_CALL,
            order: 1,
            config: {
                method: TaskMethod.POST,
                body: { data: 'test' }
            } as any // Intentionally missing required url
        };

        const workflow: Workflow = {
            id: '1',
            name: 'Test Workflow',
            tasks: [task],
            validations: []
        };

        const context: WorkflowContext = {
            data: { test: 'data' }
        };

        jest.spyOn(taskExecutor, 'executeTask').mockImplementationOnce(() => Promise.resolve({
            task,
            taskId: task.id,
            success: false,
            error: 'URL is required for API task'
        }));

        const result = await workflowEngine.executeWorkflow(workflow, context);

        expect(result.success).toBe(false);
        expect(result.taskResults).toHaveLength(1);
        expect(result.taskResults[0].success).toBe(false);
        expect(result.taskResults[0].error).toBe('URL is required for API task');
    });

    it('should update workflow context with task results', async () => {
        const task: Task = {
            id: '1',
            type: TaskType.API_CALL,
            order: 1,
            config: {
                url: 'https://api.test.com',
                method: TaskMethod.POST,
                body: { data: 'test' }
            }
        };

        const workflow: Workflow = {
            id: '1',
            name: 'Test Workflow',
            tasks: [task],
            validations: []
        };

        const context: WorkflowContext = {
            data: { test: 'data' }
        };

        const taskResult = {
            task,
            taskId: task.id,
            success: true,
            output: {
                statusCode: 200,
                headers: {},
                data: { result: 'success' }
            }
        };

        jest.spyOn(taskExecutor, 'executeTask').mockImplementationOnce(() => Promise.resolve(taskResult));

        const result = await workflowEngine.executeWorkflow(workflow, context);

        expect(result.success).toBe(true);
        expect(result.context.data).toEqual({
            test: 'data',
            task1: taskResult.output
        });
    });

    it('should stop execution on critical task failure', async () => {
        const tasks: Task[] = [
            {
                id: '1',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com/1',
                    method: TaskMethod.POST,
                    body: { data: 'test1' }
                }
            },
            {
                id: '2',
                type: TaskType.API_CALL,
                order: 2,
                config: {
                    url: 'https://api.test.com/2',
                    method: TaskMethod.POST,
                    body: { data: 'test2' }
                }
            }
        ];

        const workflow: Workflow = {
            id: '1',
            name: 'Test Workflow',
            tasks,
            validations: []
        };

        const context: WorkflowContext = {
            data: { test: 'data' }
        };

        jest.spyOn(taskExecutor, 'executeTask')
            .mockImplementationOnce(() => Promise.resolve({
                task: tasks[0],
                taskId: tasks[0].id,
                success: false,
                error: 'Critical task failure'
            }));

        const result = await workflowEngine.executeWorkflow(workflow, context);

        expect(result.success).toBe(false);
        expect(result.taskResults).toHaveLength(1);
        expect(result.taskResults[0].success).toBe(false);
        expect(result.taskResults[0].error).toBe('Critical task failure');
    });
});