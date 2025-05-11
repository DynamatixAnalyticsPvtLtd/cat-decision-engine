import { WorkflowEngine } from './workflow-engine';
import { Task } from './types/task';
import { TaskExecutor } from './executors/task-executor';
import { DefaultLogger } from './logging/default-logger';
import { TaskResult } from './types/task-result';
import { TaskType, TaskMethod } from './enums/task.enum';

describe('WorkflowEngine Task Execution', () => {
    let workflowEngine: WorkflowEngine;
    let taskExecutor: jest.Mocked<TaskExecutor>;
    let logger: DefaultLogger;

    beforeEach(() => {
        logger = new DefaultLogger();
        taskExecutor = new TaskExecutor(logger) as jest.Mocked<TaskExecutor>;
        taskExecutor.execute = jest.fn().mockImplementation(async (task: Task, context: { data: any }) => ({
            task,
            taskId: task.id,
            success: true,
            output: { result: 'success' },
            metadata: {
                contextData: context.data
            }
        }));
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
            expect(taskExecutor.execute).toHaveBeenCalledWith(task, { data });
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
            const result = await workflowEngine.execute(workflow, data);

            expect(result.success).toBe(true);
            expect(result.taskResults).toHaveLength(2);
            expect(result.taskResults[0].taskId).toBe('task-1');
            expect(result.taskResults[1].taskId).toBe('task-2');
            expect(taskExecutor.execute).toHaveBeenCalledTimes(2);
            expect(taskExecutor.execute).toHaveBeenNthCalledWith(1, task1, { data });
            expect(taskExecutor.execute).toHaveBeenNthCalledWith(2, task2, { data });
        });

        it('should stop execution on task failure', async () => {
            taskExecutor.execute.mockRejectedValueOnce(new Error('API call failed'));

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
            const result = await workflowEngine.execute(workflow, data);

            expect(result.success).toBe(false);
            expect(result.taskResults).toHaveLength(1);
            expect(result.taskResults[0].success).toBe(false);
            expect(result.taskResults[0].error).toBe('API call failed');
            expect(taskExecutor.execute).toHaveBeenCalledTimes(1);
        });

        it('should handle task with dependencies', async () => {
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
                    method: TaskMethod.GET,
                    dependencies: ['task-1']
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
            const result = await workflowEngine.execute(workflow, data);

            expect(result.success).toBe(true);
            expect(result.taskResults).toHaveLength(2);
            expect(result.taskResults[0].taskId).toBe('task-1');
            expect(result.taskResults[1].taskId).toBe('task-2');
            expect(taskExecutor.execute).toHaveBeenCalledTimes(2);
            expect(taskExecutor.execute).toHaveBeenNthCalledWith(1, task1, { data });
            expect(taskExecutor.execute).toHaveBeenNthCalledWith(2, task2, { data });
        });
    });
});