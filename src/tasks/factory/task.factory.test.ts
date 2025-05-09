/*import { TaskFactory } from './task.factory';
import { TaskType, TaskMethod } from '../enums/task.enum';
import { BaseTask } from '../base/task.interface';
import { ApiTask } from '../api/api-task.interface';
import { TaskError } from '../../core/errors/workflow-error';
import { ApiTaskExecutor } from '../api/api-task.executor';

jest.mock('../api/api-task.executor');

describe('TaskFactory', () => {
    let taskFactory: TaskFactory;
    let mockLogger: any;
    let mockApiTaskExecutor: jest.Mocked<ApiTaskExecutor>;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn()
        };

        mockApiTaskExecutor = {
            execute: jest.fn()
        } as any;

        (ApiTaskExecutor as jest.Mock).mockImplementation(() => mockApiTaskExecutor);

        taskFactory = new TaskFactory(mockLogger);
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('executeTask', () => {
        it('should throw error when task type is not supported', async () => {
            const task = {
                id: '1',
                type: 'unsupported' as TaskType,
                order: 1
            };

            await expect(taskFactory.executeTask(task)).rejects.toThrow(TaskError);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'No executor found for task type: unsupported',
                { taskId: '1' }
            );
        });

        it('should execute API task successfully', async () => {
            const task: ApiTask = {
                id: '1',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.GET
                }
            };

            const mockResponse = {
                success: true,
                taskId: '1',
                output: {
                    statusCode: 200,
                    headers: { 'content-type': 'application/json' },
                    data: { message: 'success' }
                }
            };

            mockApiTaskExecutor.execute.mockResolvedValueOnce(mockResponse);

            const result = await taskFactory.executeTask(task);
            expect(result).toEqual(mockResponse);
            expect(mockApiTaskExecutor.execute).toHaveBeenCalledWith(task);
        });

        it('should handle API task failure', async () => {
            const task: ApiTask = {
                id: '1',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com/error',
                    method: TaskMethod.GET
                }
            };

            const error = new TaskError('API call failed', task.id);
            mockApiTaskExecutor.execute.mockRejectedValueOnce(error);

            await expect(taskFactory.executeTask(task)).rejects.toThrow(TaskError);
            expect(mockApiTaskExecutor.execute).toHaveBeenCalledWith(task);
        });
    });
}); */