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
        taskFactory = new TaskFactory(logger);

        mockLogger = {
            debug: jest.fn(),
            error: jest.fn()
        };

        mockApiTaskExecutor = {
            execute: jest.fn()
        } as any;

        mockValidationService = {
            validateTask: jest.fn()
        } as any;

        (ApiTaskExecutor as jest.Mock).mockImplementation(() => mockApiTaskExecutor);
        (TaskValidationService as jest.Mock).mockImplementation(() => mockValidationService);

        jest.clearAllMocks();
    });

    describe('getTaskExecutor', () => {
        it('should return executor for supported task type', () => {
            const executor = taskFactory.getTaskExecutor(TaskType.API_CALL);
            expect(executor).toBeDefined();
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

            mockApiTaskExecutor.execute.mockResolvedValueOnce(mockOutput);

            const result = await taskFactory.executeTask(mockTask, mockContext);

            expect(result).toEqual({
                taskId: mockTask.id,
                success: true,
                output: mockOutput,
                metadata: {
                    contextData: mockContext.data
                }
            });
        });

        it('should throw error for unsupported task type', async () => {
            const mockTask = {
                id: 'test-task',
                name: 'Test Task',
                type: 'unsupported' as TaskType,
                order: 1,
                config: {}
            };

            const mockContext = { data: { test: 'value' } };
            const validationError = new TaskError('Unsupported task type: unsupported');

            await expect(taskFactory.executeTask(mockTask, mockContext)).rejects.toThrow(validationError);
        });

        it('should throw error when task execution fails', async () => {
            const task = {
                id: 'test-task',
                name: 'Test Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'invalid-url'
                }
            };

            const mockContext = { data: { test: 'value' } };
            mockApiTaskExecutor.execute.mockRejectedValueOnce(new TaskError('Task execution failed'));

            await expect(taskFactory.executeTask(task, mockContext)).rejects.toThrow(TaskError);
            await expect(taskFactory.executeTask(task, mockContext)).rejects.toThrow('Task execution failed');
        });

        it('should handle task execution errors', async () => {
            const mockTask = {
                id: 'test-task',
                name: 'Test Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: 'GET'
                }
            };

            const mockContext = { data: { test: 'value' } };
            mockApiTaskExecutor.execute.mockRejectedValueOnce(new TaskError('Task execution failed'));

            await expect(taskFactory.executeTask(mockTask, mockContext)).rejects.toThrow(TaskError);
            await expect(taskFactory.executeTask(mockTask, mockContext)).rejects.toThrow('Task execution failed');
        });

        it('should handle unknown errors', async () => {
            const mockTask = {
                id: 'test-task',
                name: 'Test Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: 'GET'
                }
            };

            const mockContext = { data: { test: 'value' } };
            mockApiTaskExecutor.execute.mockRejectedValueOnce(new Error('Unknown error'));

            await expect(taskFactory.executeTask(mockTask, mockContext)).rejects.toThrow(TaskError);
            await expect(taskFactory.executeTask(mockTask, mockContext)).rejects.toThrow('Unknown error');
        });
    });
});