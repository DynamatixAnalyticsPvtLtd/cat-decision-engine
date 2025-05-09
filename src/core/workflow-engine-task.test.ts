/*import { WorkflowEngine } from './workflow-engine';
import { Workflow } from './types/workflow';
import { WorkflowContext } from './types/workflow-context';
import { Task } from './types/task';
import { TaskType, TaskMethod } from '../tasks/enums/task.enum';

describe('WorkflowEngine - Task Execution', () => {
    let workflowEngine: WorkflowEngine;
    let mockLogger: any;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn()
        };
        workflowEngine = new WorkflowEngine(mockLogger);
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

        jest.spyOn(workflowEngine as any, 'executeTask').mockImplementationOnce(() => ({
            success: true,
            taskId: '1',
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

        jest.spyOn(workflowEngine as any, 'executeTask')
            .mockImplementationOnce(() => ({
                success: true,
                taskId: '1',
                output: {
                    statusCode: 200,
                    headers: {},
                    data: { result: 'success1' }
                }
            }))
            .mockImplementationOnce(() => ({
                success: true,
                taskId: '2',
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

        jest.spyOn(workflowEngine as any, 'executeTask').mockImplementationOnce(() => {
            throw new Error('Task execution failed');
        });

        const result = await workflowEngine.executeWorkflow(workflow, context);

        expect(result.success).toBe(false);
        expect(result.taskResults).toHaveLength(1);
        expect(result.taskResults[0].success).toBe(false);
        expect(result.taskResults[0].error).toBeDefined();
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

        const result = await workflowEngine.executeWorkflow(workflow, context);

        expect(result.success).toBe(false);
        expect(result.taskResults).toHaveLength(1);
        expect(result.taskResults[0].success).toBe(false);
        expect(result.taskResults[0].error).toContain('URL is required');
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
            success: true,
            taskId: '1',
            output: {
                statusCode: 200,
                headers: {},
                data: { result: 'success' }
            }
        };

        jest.spyOn(workflowEngine as any, 'executeTask').mockImplementationOnce(() => taskResult);

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

        jest.spyOn(workflowEngine as any, 'executeTask')
            .mockImplementationOnce(() => {
                throw new Error('Critical task failure');
            });

        const result = await workflowEngine.executeWorkflow(workflow, context);

        expect(result.success).toBe(false);
        expect(result.taskResults).toHaveLength(1);
        expect(result.taskResults[0].success).toBe(false);
        expect(result.taskResults[0].error).toBeDefined();
    });
}); */