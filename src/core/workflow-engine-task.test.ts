import { WorkflowEngine } from './workflow-engine';
import { Task } from './types/task';
import { TaskExecutor } from './executors/task-executor';
import { DefaultLogger } from './logging/default-logger';
import { TaskResult } from './types/task-result';
import { TaskType, TaskMethod } from './enums/task.enum';
import { TaskFactory } from '../tasks/factory/task.factory';

describe('WorkflowEngine Task Execution', () => {
    let workflowEngine: WorkflowEngine;
    let taskExecutor: jest.Mocked<TaskExecutor>;
    let logger: DefaultLogger;

    beforeAll(() => {
        jest.spyOn(TaskFactory.prototype, 'executeTask').mockImplementation(async (task, context) => ({
            task,
            taskId: task.id,
            success: true,
            result: { result: 'success' },
            metadata: {
                taskId: task.id,
                type: task.type,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                duration: 0
            }
        }));
    });

    beforeEach(() => {
        logger = new DefaultLogger();
        taskExecutor = new TaskExecutor(logger) as jest.Mocked<TaskExecutor>;
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

            const result = await workflowEngine.execute(workflow, { test: 'value' });

            expect(result.success).toBe(true);
            expect(result.taskResults).toHaveLength(1);
            expect(result.taskResults[0]).toMatchObject({
                taskId: 'task-1',
                success: true,
                result: { result: { result: 'success' } }
            });
            expect(result.taskResults[0].metadata).toBeDefined();
        });

        it('should execute multiple tasks in order', async () => {
            const task1: Task = {
                id: 'task-1',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com/1',
                    method: TaskMethod.GET
                }
            };

            const task2: Task = {
                id: 'task-2',
                type: TaskType.API_CALL,
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

            const result = await workflowEngine.execute(workflow, { test: 'value' });

            expect(result.success).toBe(true);
            expect(result.taskResults).toHaveLength(2);
            expect(result.taskResults[0].taskId).toBe('task-1');
            expect(result.taskResults[1].taskId).toBe('task-2');
        });

        it('should stop execution on task failure', async () => {
            // Make the first call to executeTask fail
            (TaskFactory.prototype.executeTask as jest.Mock).mockRejectedValueOnce(new Error('API call failed'));

            const task1: Task = {
                id: 'task-1',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com/1',
                    method: TaskMethod.GET
                }
            };

            const task2: Task = {
                id: 'task-2',
                type: TaskType.API_CALL,
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

            const result = await workflowEngine.execute(workflow, { test: 'value' });

            expect(result.success).toBe(false);
            expect(result.taskResults).toHaveLength(1);
            expect(result.taskResults[0].success).toBe(false);
            expect(result.taskResults[0].error).toBe('API call failed');
        });

        it('should handle task with dependencies', async () => {
            const task1: Task = {
                id: 'task-1',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com/1',
                    method: TaskMethod.GET
                }
            };

            const task2: Task = {
                id: 'task-2',
                type: TaskType.API_CALL,
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

            const result = await workflowEngine.execute(workflow, { test: 'value' });

            expect(result.success).toBe(true);
            expect(result.taskResults).toHaveLength(2);
            expect(result.taskResults[0].taskId).toBe('task-1');
            expect(result.taskResults[1].taskId).toBe('task-2');
        });
    });
});