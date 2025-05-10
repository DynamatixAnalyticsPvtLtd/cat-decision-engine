import { TaskExecutor } from './task-executor';
import { Task, TaskResult, WorkflowContext } from '../types';
import { TaskType, TaskMethod } from '../enums/task.enum';
import { TaskError } from '../errors/workflow-error';
import { TaskFactory } from '../../tasks/factory/task.factory';

jest.mock('../../tasks/factory/task.factory');

describe('TaskExecutor', () => {
    let taskExecutor: TaskExecutor;
    let mockLogger: any;
    let mockTaskFactory: jest.Mocked<TaskFactory>;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn()
        };

        mockTaskFactory = {
            executeTask: jest.fn()
        } as any;

        (TaskFactory as jest.Mock).mockImplementation(() => mockTaskFactory);

        taskExecutor = new TaskExecutor(mockLogger);
        jest.clearAllMocks();
    });

    describe('executeTask', () => {
        const mockTask: Task = {
            id: '1',
            type: TaskType.API_CALL,
            order: 1,
            config: {
                url: 'https://api.test.com',
                method: TaskMethod.GET
            }
        };

        const mockContext: WorkflowContext = {
            data: { test: 'data' }
        };

        it('should execute task successfully', async () => {
            const mockResult: TaskResult = {
                task: mockTask,
                taskId: '1',
                success: true,
                output: { data: 'test' }
            };

            mockTaskFactory.executeTask.mockResolvedValueOnce(mockResult);

            const result = await taskExecutor.executeTask(mockTask, mockContext);

            expect(result).toEqual({
                ...mockResult,
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(mockTaskFactory.executeTask).toHaveBeenCalledWith(mockTask);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Starting task execution',
                { taskId: '1', type: TaskType.API_CALL }
            );
        });

        it('should handle task validation error', async () => {
            const error = new TaskError('Invalid task configuration', '1');
            mockTaskFactory.executeTask.mockRejectedValueOnce(error);

            const result = await taskExecutor.executeTask(mockTask, mockContext);

            expect(result).toEqual({
                task: mockTask,
                taskId: '1',
                success: false,
                error: 'Invalid task configuration',
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Task execution failed',
                {
                    taskId: '1',
                    type: TaskType.API_CALL,
                    error: 'Invalid task configuration'
                }
            );
        });

        it('should handle task execution error', async () => {
            const error = new Error('Task execution failed');
            mockTaskFactory.executeTask.mockRejectedValueOnce(error);

            const result = await taskExecutor.executeTask(mockTask, mockContext);

            expect(result).toEqual({
                task: mockTask,
                taskId: '1',
                success: false,
                error: 'Task execution failed',
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Task execution failed',
                {
                    taskId: '1',
                    type: TaskType.API_CALL,
                    error: 'Task execution failed'
                }
            );
        });
    });

    describe('executeTasks', () => {
        const mockTasks: Task[] = [
            {
                id: '1',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com/1',
                    method: TaskMethod.GET
                }
            },
            {
                id: '2',
                type: TaskType.API_CALL,
                order: 2,
                config: {
                    url: 'https://api.test.com/2',
                    method: TaskMethod.POST
                }
            }
        ];

        const mockContext: WorkflowContext = {
            data: { test: 'data' }
        };

        it('should execute all tasks successfully', async () => {
            const mockResults: TaskResult[] = [
                {
                    task: mockTasks[0],
                    taskId: '1',
                    success: true,
                    output: { data: 'test1' }
                },
                {
                    task: mockTasks[1],
                    taskId: '2',
                    success: true,
                    output: { data: 'test2' }
                }
            ];

            mockTaskFactory.executeTask
                .mockResolvedValueOnce(mockResults[0])
                .mockResolvedValueOnce(mockResults[1]);

            const results = await taskExecutor.executeTasks(mockTasks, mockContext);

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({
                ...mockResults[0],
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(results[1]).toEqual({
                ...mockResults[1],
                metadata: {
                    contextData: mockContext.data
                }
            });
        });

        it('should stop execution on task failure with stop on error', async () => {
            const mockResults: TaskResult[] = [
                {
                    task: mockTasks[0],
                    taskId: '1',
                    success: false,
                    error: 'Task failed'
                }
            ];

            const tasksWithStopOnError = [
                {
                    ...mockTasks[0],
                    onError: 'stop' as const
                },
                mockTasks[1]
            ];

            mockTaskFactory.executeTask.mockResolvedValueOnce(mockResults[0]);

            const results = await taskExecutor.executeTasks(tasksWithStopOnError, mockContext);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                ...mockResults[0],
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(mockTaskFactory.executeTask).toHaveBeenCalledTimes(1);
        });

        it('should continue execution on task failure without stop on error', async () => {
            const mockResults: TaskResult[] = [
                {
                    task: mockTasks[0],
                    taskId: '1',
                    success: false,
                    error: 'Task failed'
                },
                {
                    task: mockTasks[1],
                    taskId: '2',
                    success: true,
                    output: { data: 'test2' }
                }
            ];

            mockTaskFactory.executeTask
                .mockResolvedValueOnce(mockResults[0])
                .mockResolvedValueOnce(mockResults[1]);

            const results = await taskExecutor.executeTasks(mockTasks, mockContext);

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({
                ...mockResults[0],
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(results[1]).toEqual({
                ...mockResults[1],
                metadata: {
                    contextData: mockContext.data
                }
            });
        });

        it('should handle task execution error', async () => {
            const error = new Error('Task execution failed');
            mockTaskFactory.executeTask.mockRejectedValueOnce(error);

            const results = await taskExecutor.executeTasks(mockTasks, mockContext);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                task: mockTasks[0],
                taskId: '1',
                success: false,
                error: 'Task execution failed',
                metadata: {
                    contextData: mockContext.data
                }
            });
        });
    });
}); 