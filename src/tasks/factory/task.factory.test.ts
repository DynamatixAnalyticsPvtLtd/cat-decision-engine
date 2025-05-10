import { TaskFactory } from './task.factory';
import { TaskType, TaskMethod } from '../enums/task.enum';
import { BaseTask } from '../base/task.interface';
import { ApiTask } from '../api/api-task.interface';
import { TaskError } from '../../core/errors/workflow-error';
import { ApiTaskExecutor } from '../api/api-task.executor';
import { TaskValidationService } from '../../core/services/task-validation.service';

jest.mock('../api/api-task.executor');
jest.mock('../../core/services/task-validation.service');

describe('TaskFactory', () => {
    let taskFactory: TaskFactory;
    let mockLogger: any;
    let mockApiTaskExecutor: jest.Mocked<ApiTaskExecutor>;
    let mockValidationService: jest.Mocked<TaskValidationService>;

    beforeEach(() => {
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

        taskFactory = new TaskFactory(mockLogger);
        jest.clearAllMocks();
    });

    describe('executeTask', () => {
        const mockTask: ApiTask = {
            id: '1',
            type: TaskType.API_CALL,
            order: 1,
            config: {
                url: 'https://api.test.com',
                method: TaskMethod.GET
            }
        };

        it('should execute API task successfully', async () => {
            const mockResult = {
                success: true,
                taskId: '1',
                output: {
                    statusCode: 200,
                    headers: { 'content-type': 'application/json' },
                    data: { message: 'success' }
                }
            };

            mockApiTaskExecutor.execute.mockResolvedValueOnce(mockResult);

            const result = await taskFactory.executeTask(mockTask);

            expect(result).toEqual(mockResult);
            expect(mockValidationService.validateTask).toHaveBeenCalledWith(mockTask);
            expect(mockApiTaskExecutor.execute).toHaveBeenCalledWith(mockTask);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Starting task execution',
                { taskId: '1', type: TaskType.API_CALL }
            );
        });

        it('should throw error when validation fails', async () => {
            const validationError = new TaskError('Invalid task configuration', '1');
            mockValidationService.validateTask.mockImplementationOnce(() => {
                throw validationError;
            });

            await expect(taskFactory.executeTask(mockTask)).rejects.toThrow(validationError);
            expect(mockValidationService.validateTask).toHaveBeenCalledWith(mockTask);
            expect(mockApiTaskExecutor.execute).not.toHaveBeenCalled();
        });

        it('should throw error for unsupported task type', async () => {
            const task = {
                id: '1',
                type: 'unsupported' as TaskType,
                order: 1
            };

            await expect(taskFactory.executeTask(task)).rejects.toThrow(TaskError);
            await expect(taskFactory.executeTask(task)).rejects.toThrow('Unsupported task type: unsupported');
            expect(mockValidationService.validateTask).toHaveBeenCalledWith(task);
            expect(mockApiTaskExecutor.execute).not.toHaveBeenCalled();
        });

        it('should handle task execution error', async () => {
            const error = new Error('Task execution failed');
            mockApiTaskExecutor.execute.mockRejectedValueOnce(error);

            await expect(taskFactory.executeTask(mockTask)).rejects.toThrow(TaskError);
            await expect(taskFactory.executeTask(mockTask)).rejects.toThrow('Task execution failed');
            expect(mockValidationService.validateTask).toHaveBeenCalledWith(mockTask);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Task execution failed',
                {
                    taskId: '1',
                    type: TaskType.API_CALL,
                    error: 'Task execution failed'
                }
            );
        });

        it('should handle unknown error during execution', async () => {
            const error = new Error('Unknown error');
            mockApiTaskExecutor.execute.mockRejectedValueOnce(error);

            await expect(taskFactory.executeTask(mockTask)).rejects.toThrow(TaskError);
            await expect(taskFactory.executeTask(mockTask)).rejects.toThrow('Unknown error');
            expect(mockValidationService.validateTask).toHaveBeenCalledWith(mockTask);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Task execution failed',
                {
                    taskId: '1',
                    type: TaskType.API_CALL,
                    error: 'Unknown error'
                }
            );
        });
    });
});