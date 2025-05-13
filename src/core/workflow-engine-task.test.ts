import { WorkflowEngine } from './workflow-engine';
import { Task } from './types/task';
import { TaskExecutor } from './executors/task-executor';
import { DefaultLogger } from './logging/default-logger';
import { TaskResult } from './types/task-result';
import { TaskType, TaskMethod } from 'tasks/enums/task.enum';

describe('WorkflowEngine Task Execution', () => {
    let workflowEngine: WorkflowEngine;
    let taskExecutor: jest.Mocked<TaskExecutor>;
    let logger: DefaultLogger;

    beforeEach(() => {
        logger = new DefaultLogger();
        taskExecutor = new TaskExecutor(logger) as jest.Mocked<TaskExecutor>;
        taskExecutor.execute = jest.fn();
        taskExecutor.executeBatch = jest.fn();
        workflowEngine = new WorkflowEngine(undefined, taskExecutor, logger);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should execute single task successfully', async () => {
            const task: Task = {
                id: 'task-1',
                type: TaskType.API_CALL,
                name: 'Test Task',
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.GET
                }
            };

            const workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: [task]
            };

            const data = { test: 'value' };
            const mockResult: TaskResult = {
                task,
                taskId: task.id,
                success: true,
                output: { result: 'success' },
                metadata: {
                    contextData: data
                }
            };
            taskExecutor.executeBatch.mockResolvedValueOnce([mockResult]);

            const result = await workflowEngine.execute(workflow, data);

            expect(result.success).toBe(true);
            expect(result.taskResults).toHaveLength(1);
            expect(result.taskResults[0]).toMatchObject({
                taskId: 'task-1',
                success: true,
                output: { result: 'success' },
                metadata: {
                    contextData: data
                }
            });
            expect(taskExecutor.executeBatch).toHaveBeenCalledWith([task], { data });
        });

        it('should execute multiple tasks in order', async () => {
            const task1: Task = {
                id: 'task-1',
                type: TaskType.API_CALL,
                name: 'Test Task 1',
                order: 1,
                config: {
                    url: 'https://api.test.com/1',
                    method: TaskMethod.GET
                }
            };

            const task2: Task = {
                id: 'task-2',
                type: TaskType.API_CALL,
                name: 'Test Task 2',
                order: 2,
                config: {
                    url: 'https://api.test.com/2',
                    method: TaskMethod.GET
                }
            };

            const workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: [task1, task2]
            };

            const data = { test: 'value' };
            const mockResults: TaskResult[] = [
                {
                    task: task1,
                    taskId: task1.id,
                    success: true,
                    output: { result: 'success' },
                    metadata: { contextData: data }
                },
                {
                    task: task2,
                    taskId: task2.id,
                    success: true,
                    output: { result: 'success' },
                    metadata: { contextData: data }
                }
            ];
            taskExecutor.executeBatch.mockResolvedValueOnce(mockResults);

            const result = await workflowEngine.execute(workflow, data);

            expect(result.success).toBe(true);
            expect(result.taskResults).toHaveLength(2);
            expect(result.taskResults[0].taskId).toBe('task-1');
            expect(result.taskResults[1].taskId).toBe('task-2');
            expect(taskExecutor.executeBatch).toHaveBeenCalledWith([task1, task2], { data });
        });

        it('should stop execution on task failure', async () => {
            const task1: Task = {
                id: 'task-1',
                type: TaskType.API_CALL,
                name: 'Test Task 1',
                order: 1,
                onError: 'stop',
                config: {
                    url: 'https://api.test.com/1',
                    method: TaskMethod.GET
                }
            };

            const task2: Task = {
                id: 'task-2',
                type: TaskType.API_CALL,
                name: 'Test Task 2',
                order: 2,
                config: {
                    url: 'https://api.test.com/2',
                    method: TaskMethod.GET
                }
            };

            const workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: [task1, task2]
            };

            const data = { test: 'value' };
            const mockResults: TaskResult[] = [
                {
                    task: task1,
                    taskId: task1.id,
                    success: false,
                    error: 'API call failed',
                    metadata: { contextData: data }
                }
            ];
            taskExecutor.executeBatch.mockResolvedValueOnce(mockResults);

            const result = await workflowEngine.execute(workflow, data);

            expect(result.success).toBe(false);
            expect(result.taskResults).toHaveLength(1);
            expect(result.taskResults[0].success).toBe(false);
            expect(result.taskResults[0].error).toBe('API call failed');
            expect(taskExecutor.executeBatch).toHaveBeenCalledWith([task1, task2], { data });
        });

        it('should execute tasks in order regardless of array order', async () => {
            const task1: Task = {
                id: 'task-1',
                type: TaskType.API_CALL,
                name: 'Test Task 1',
                order: 1,
                config: {
                    url: 'https://api.test.com/1',
                    method: TaskMethod.GET
                }
            };

            const task2: Task = {
                id: 'task-2',
                type: TaskType.API_CALL,
                name: 'Test Task 2',
                order: 2,
                config: {
                    url: 'https://api.test.com/2',
                    method: TaskMethod.GET
                }
            };

            // Note: tasks are added in reverse order
            const workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: [task2, task1]
            };

            const data = { test: 'value' };
            const mockResults: TaskResult[] = [
                {
                    task: task1,
                    taskId: task1.id,
                    success: true,
                    output: { result: 'success' },
                    metadata: { contextData: data }
                },
                {
                    task: task2,
                    taskId: task2.id,
                    success: true,
                    output: { result: 'success' },
                    metadata: { contextData: data }
                }
            ];
            taskExecutor.executeBatch.mockResolvedValueOnce(mockResults);

            const result = await workflowEngine.execute(workflow, data);

            expect(result.success).toBe(true);
            expect(result.taskResults).toHaveLength(2);
            expect(result.taskResults[0].taskId).toBe('task-1');
            expect(result.taskResults[1].taskId).toBe('task-2');
            expect(taskExecutor.executeBatch).toHaveBeenCalledWith([task2, task1], { data });
        });
    });
});