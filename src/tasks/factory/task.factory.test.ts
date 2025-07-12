import { TaskFactory } from './task.factory';
import { TaskType } from '../enums/task.enum';
import { Task } from '../../core/types/task';
import { TaskError } from '../../core/errors/workflow-error';
import { ApiTaskExecutor } from '../api/api-task.executor';
import { TaskValidationService } from '../../core/services/task-validation.service';
import { DefaultLogger } from '../../core/logging/default-logger';

jest.mock('../api/api-task.executor');
jest.mock('../../core/services/task-validation.service');

describe('TaskFactory', () => {
    let taskFactory: TaskFactory;
    let logger: DefaultLogger;
    let mockLogger: any;
    let mockApiTaskExecutor: jest.Mocked<ApiTaskExecutor>;
    let mockValidationService: jest.Mocked<TaskValidationService>;

    beforeEach(() => {
        logger = new DefaultLogger();

        // Create proper jest mocks
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn()
        };

        mockApiTaskExecutor = {
            execute: jest.fn()
        } as unknown as jest.Mocked<ApiTaskExecutor>;

        mockValidationService = {
            validateTask: jest.fn()
        } as unknown as jest.Mocked<TaskValidationService>;

        // Mock the constructors
        (ApiTaskExecutor as jest.Mock).mockImplementation(() => mockApiTaskExecutor);
        (TaskValidationService as jest.Mock).mockImplementation(() => mockValidationService);

        taskFactory = new TaskFactory(mockLogger);
        jest.clearAllMocks();
    });

    describe('getTaskExecutor', () => {
        it('should return executor for supported task type', () => {
            const executor = taskFactory.getTaskExecutor(TaskType.API_CALL);
            expect(executor).toBeDefined();
            expect(executor).toBe(mockApiTaskExecutor);
        });

        it('should return null for unsupported task type', () => {
            const executor = taskFactory.getTaskExecutor('unsupported' as TaskType);
            expect(executor).toBeNull();
        });
    });

    describe('executeTask', () => {
        const mockTask: Task = {
            id: '1',
            name: 'Test Task',
            type: TaskType.API_CALL,
            order: 1,
            config: {
                url: 'https://api.test.com',
                method: 'GET'
            }
        };

        it('should execute task successfully', async () => {
            const mockContext = { data: { test: 'value' } };
            const mockOutput = {
                statusCode: 200,
                headers: { 'content-type': 'application/json' },
                data: { message: 'success' }
            };

            mockValidationService.validateTask.mockImplementation(() => { });
            mockApiTaskExecutor.execute.mockResolvedValueOnce(mockOutput as any);

            const result = await taskFactory.executeTask(mockTask, mockContext);

            expect(result).toEqual({
                task: mockTask,
                taskId: mockTask.id,
                success: true,
                output: mockOutput,
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Starting task execution',
                { taskId: mockTask.id, type: mockTask.type }
            );
        });

        it('should handle unsupported task type', async () => {
            const mockTask = {
                id: 'test-task',
                name: 'Test Task',
                type: 'unsupported' as TaskType,
                order: 1,
                config: {}
            };

            const mockContext = { data: { test: 'value' } };

            const result = await taskFactory.executeTask(mockTask, mockContext);

            expect(result).toEqual({
                task: mockTask,
                taskId: mockTask.id,
                success: false,
                error: `Unsupported task type: unsupported`,
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(mockLogger.error).not.toHaveBeenCalled();
        });

        it('should handle validation errors', async () => {
            const mockContext = { data: { test: 'value' } };
            const validationError = new TaskError('Invalid task configuration');

            mockValidationService.validateTask.mockImplementation(() => {
                throw validationError;
            });

            const result = await taskFactory.executeTask(mockTask, mockContext);

            expect(result).toEqual({
                task: mockTask,
                taskId: mockTask.id,
                success: false,
                error: 'Invalid task configuration',
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Task execution failed',
                {
                    taskId: mockTask.id,
                    type: mockTask.type,
                    error: 'Invalid task configuration'
                }
            );
        });

        it('should handle task execution errors', async () => {
            const mockContext = { data: { test: 'value' } };
            const executionError = new TaskError('Task execution failed');

            mockValidationService.validateTask.mockImplementation(() => { });
            mockApiTaskExecutor.execute.mockRejectedValueOnce(executionError);

            const result = await taskFactory.executeTask(mockTask, mockContext);

            expect(result).toEqual({
                task: mockTask,
                taskId: mockTask.id,
                success: false,
                error: 'Task execution failed',
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Task execution failed',
                {
                    taskId: mockTask.id,
                    type: mockTask.type,
                    error: 'Task execution failed'
                }
            );
        });

        it('should handle unknown errors', async () => {
            const mockContext = { data: { test: 'value' } };
            const unknownError = new Error('Unknown error');

            mockValidationService.validateTask.mockImplementation(() => { });
            mockApiTaskExecutor.execute.mockRejectedValueOnce(unknownError);

            const result = await taskFactory.executeTask(mockTask, mockContext);

            expect(result).toEqual({
                task: mockTask,
                taskId: mockTask.id,
                success: false,
                error: 'Unknown error',
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Task execution failed',
                {
                    taskId: mockTask.id,
                    type: mockTask.type,
                    error: 'Unknown error'
                }
            );
        });
    });
});