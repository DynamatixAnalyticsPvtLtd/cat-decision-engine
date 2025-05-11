import { WorkflowEngine } from './workflow-engine';
import { Workflow, Task } from './types';
import { TaskType, TaskMethod } from '../tasks/enums/task.enum';
import { TaskExecutor } from './executors/task-executor';
import { ValidationExecutor } from './executors/validation-executor';
import { ILogger } from './interfaces/logger.interface';

jest.mock('./executors/task-executor');
jest.mock('./executors/validation-executor');

describe('WorkflowEngine Context', () => {
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
        it('should maintain context between tasks', async () => {
            const task1: Task = {
                id: 'task-1',
                type: TaskType.API_CALL,
                name: 'First Task',
                order: 1,
                config: {
                    url: 'https://api.test.com/1',
                    method: TaskMethod.GET
                }
            };

            const task2: Task = {
                id: 'task-2',
                type: TaskType.API_CALL,
                name: 'Second Task',
                order: 2,
                config: {
                    url: 'https://api.test.com/2',
                    method: TaskMethod.POST,
                    body: { data: 'test' }
                }
            };

            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: [task1, task2]
            };

            const data = { test: 'value' };

            // Mock validation executor
            validationExecutor.execute.mockResolvedValueOnce({
                success: true,
                validationResults: []
            });

            // Mock task executor
            taskExecutor.executeBatch.mockResolvedValueOnce([
                {
                    task: task1,
                    taskId: task1.id,
                    success: true,
                    output: { status: 'success' },
                    metadata: {
                        contextData: data
                    }
                },
                {
                    task: task2,
                    taskId: task2.id,
                    success: true,
                    output: { status: 'success' },
                    metadata: {
                        contextData: data
                    }
                }
            ]);

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: true,
                context: { data },
                validationResults: [],
                taskResults: [
                    {
                        task: task1,
                        taskId: task1.id,
                        success: true,
                        output: { status: 'success' },
                        metadata: {
                            contextData: data
                        }
                    },
                    {
                        task: task2,
                        taskId: task2.id,
                        success: true,
                        output: { status: 'success' },
                        metadata: {
                            contextData: data
                        }
                    }
                ]
            });

            // Verify task execution order and context
            expect(taskExecutor.executeBatch).toHaveBeenCalledWith([task1, task2], { data });
        });

        it('should handle context updates from tasks', async () => {
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
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: [task]
            };

            const data = { test: 'value' };

            // Mock validation executor
            validationExecutor.execute.mockResolvedValueOnce({
                success: true,
                validationResults: []
            });

            // Mock task executor
            taskExecutor.executeBatch.mockResolvedValueOnce([{
                task,
                taskId: task.id,
                success: true,
                output: { status: 'success', data: { updated: true } },
                metadata: {
                    contextData: data
                }
            }]);

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: true,
                context: { data },
                validationResults: [],
                taskResults: [{
                    task,
                    taskId: task.id,
                    success: true,
                    output: { status: 'success', data: { updated: true } },
                    metadata: {
                        contextData: data
                    }
                }]
            });

            expect(taskExecutor.executeBatch).toHaveBeenCalledWith([task], { data });
        });

        it('should handle empty context', async () => {
            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: []
            };

            const data = {};

            // Mock validation executor
            validationExecutor.execute.mockResolvedValueOnce({
                success: true,
                validationResults: []
            });

            // Mock task executor
            taskExecutor.executeBatch.mockResolvedValueOnce([]);

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: true,
                context: { data },
                validationResults: [],
                taskResults: []
            });

            expect(taskExecutor.executeBatch).not.toHaveBeenCalled();
        });
    });
});