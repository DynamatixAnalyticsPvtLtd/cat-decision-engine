import { TaskExecutor } from './task-executor';
import { Task, WorkflowContext } from '../types';
import { TaskError } from '../errors/workflow-error';
import { TaskFactory } from '../../tasks/factory/task.factory';
import { TaskMethod, TaskType } from '../../tasks/enums/task.enum';

jest.mock('../../tasks/factory/task.factory');

describe('TaskExecutor', () => {
    let taskExecutor: TaskExecutor;
    let mockLogger: any;
    let mockTaskFactory: jest.Mocked<TaskFactory>;
    let mockExecutor: { execute: jest.Mock };

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn()
        };

        mockExecutor = { execute: jest.fn() };

        mockTaskFactory = {
            executeTask: jest.fn(),
            getTaskExecutor: jest.fn().mockReturnValue(mockExecutor)
        } as any;

        (TaskFactory as jest.Mock).mockImplementation(() => mockTaskFactory);

        taskExecutor = new TaskExecutor(mockLogger);
        jest.clearAllMocks();
    });

    describe('execute', () => {
        const mockTask: Task = {
            id: '1',
            name: 'Test Task',
            type: TaskType.API_CALL,
            order: 1,
            config: {
                url: 'https://api.test.com',
                method: TaskMethod.GET
            }
        };

        const mockContext: WorkflowContext = {
            data: { test: 'data' },
            workflowId: '1',
            workflowName: 'Test Workflow',
            executionId: '1'
        };

        it('should execute task successfully', async () => {
            const mockOutput = { data: 'test' };
            mockExecutor.execute.mockResolvedValueOnce(mockOutput);

            const result = await taskExecutor.execute(mockTask, mockContext);

            expect(result).toEqual({
                task: mockTask,
                taskId: '1',
                success: true,
                output: mockOutput,
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Starting task execution',
                { taskId: '1', type: TaskType.API_CALL }
            );
        });

        it('should handle task validation error', async () => {
            const error = new TaskError('Invalid task configuration', '1');
            mockExecutor.execute.mockRejectedValueOnce(error);

            const result = await taskExecutor.execute(mockTask, mockContext);

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
            mockExecutor.execute.mockRejectedValueOnce(error);

            const result = await taskExecutor.execute(mockTask, mockContext);

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

    describe('executeBatch', () => {
        const mockTasks: Task[] = [
            {
                id: '1',
                name: 'Test Task 1',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com/1',
                    method: TaskMethod.GET
                }
            },
            {
                id: '2',
                name: 'Test Task 2',
                type: TaskType.API_CALL,
                order: 2,
                config: {
                    url: 'https://api.test.com/2',
                    method: TaskMethod.POST
                }
            }
        ];

        const mockContext: WorkflowContext = {
            data: { test: 'data' },
            workflowId: '1',
            workflowName: 'Test Workflow',
            executionId: '1'
        };

        it('should execute all tasks successfully', async () => {
            const mockOutputs = [
                { data: 'test1' },
                { data: 'test2' }
            ];
            mockExecutor.execute
                .mockResolvedValueOnce(mockOutputs[0])
                .mockResolvedValueOnce(mockOutputs[1]);

            const results = await taskExecutor.executeBatch(mockTasks, mockContext);

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({
                task: mockTasks[0],
                taskId: '1',
                success: true,
                output: mockOutputs[0],
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(results[1]).toEqual({
                task: mockTasks[1],
                taskId: '2',
                success: true,
                output: mockOutputs[1],
                metadata: {
                    contextData: mockContext.data
                }
            });
        });

        it('should stop execution on task failure with stop on error', async () => {
            // Simulate failure on first task
            mockExecutor.execute.mockRejectedValueOnce(new Error('Task failed'));

            const tasksWithStopOnError = [
                {
                    ...mockTasks[0],
                    onError: 'stop' as const
                },
                mockTasks[1]
            ];

            const results = await taskExecutor.executeBatch(tasksWithStopOnError, mockContext);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                task: tasksWithStopOnError[0],
                taskId: '1',
                success: false,
                error: 'Task failed',
                metadata: {
                    contextData: mockContext.data
                }
            });
        });

        it('should continue execution on task failure without stop on error', async () => {
            mockExecutor.execute
                .mockRejectedValueOnce(new Error('Task failed'))
                .mockResolvedValueOnce({ data: 'test2' });

            const results = await taskExecutor.executeBatch(mockTasks, mockContext);

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({
                task: mockTasks[0],
                taskId: '1',
                success: false,
                error: 'Task failed',
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(results[1]).toEqual({
                task: mockTasks[1],
                taskId: '2',
                success: true,
                output: { data: 'test2' },
                metadata: {
                    contextData: mockContext.data
                }
            });
        });
    });
}); 