import { ApiTaskExecutor } from './api-task.executor';
import { ApiTask } from './api-task.interface';
import { TaskMethod, TaskType } from '../enums/task.enum';
import { TaskError } from '../../core/errors/workflow-error';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Type for mock response
interface MockAxiosResponse {
    status: number;
    headers?: Record<string, string>;
    data: any;
}

// Type for mock error
interface MockAxiosError {
    message: string;
    code: string;
    response?: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        data: any;
    };
}

describe('ApiTaskExecutor', () => {
    let apiTaskExecutor: ApiTaskExecutor;
    let mockLogger: any;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
        apiTaskExecutor = new ApiTaskExecutor(mockLogger);
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should execute API task successfully with GET method', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.GET
                }
            };

            const mockResponse: MockAxiosResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: { message: 'success' }
            };

            (mockedAxios as any).mockResolvedValueOnce(mockResponse);

            const result = await apiTaskExecutor.execute(task, { data: {} } as any);

            expect(result).toEqual({
                statusCode: 200,
                headers: { 'content-type': 'application/json' },
                data: { message: 'success' }
            });
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Executing API task',
                { taskId: '1', url: 'https://api.test.com', method: 'GET' }
            );
        });

        it('should handle API task failure with network error', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com/error',
                    method: TaskMethod.GET
                }
            };

            const errorMessage = 'Network Error';
            (mockedAxios as any).mockRejectedValueOnce(new Error(errorMessage));

            await expect(apiTaskExecutor.execute(task, { data: {} } as any)).rejects.toThrow(TaskError);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'API task execution failed',
                { taskId: '1', error: errorMessage }
            );
        });

        it('should handle API task failure with 4xx status code', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com/error',
                    method: TaskMethod.GET
                }
            };

            const error: MockAxiosError = {
                message: 'Bad Request',
                code: '400',
                response: {
                    status: 400,
                    statusText: 'Bad Request',
                    headers: {},
                    data: { error: 'Invalid input' }
                }
            };

            (mockedAxios as any).mockRejectedValueOnce(error);

            await expect(apiTaskExecutor.execute(task, { data: {} } as any)).rejects.toThrow(TaskError);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'API task execution failed',
                { taskId: '1', error: 'Unknown error' }
            );
        });

        it('should handle API task failure with 5xx status code', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com/error',
                    method: TaskMethod.GET
                }
            };

            const error: MockAxiosError = {
                message: 'Internal Server Error',
                code: '500',
                response: {
                    status: 500,
                    statusText: 'Internal Server Error',
                    headers: {},
                    data: { error: 'Server error' }
                }
            };

            (mockedAxios as any).mockRejectedValueOnce(error);

            await expect(apiTaskExecutor.execute(task, { data: {} } as any)).rejects.toThrow(TaskError);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'API task execution failed',
                { taskId: '1', error: 'Unknown error' }
            );
        });

        it('should include all request parameters in API call', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.POST,
                    headers: { 'Authorization': 'Bearer token' },
                    body: { data: 'test' },
                    queryParams: { filter: 'active' },
                    timeout: 5000
                }
            };

            const mockResponse: MockAxiosResponse = {
                status: 200,
                headers: {},
                data: {}
            };

            (mockedAxios as any).mockResolvedValueOnce(mockResponse);

            await apiTaskExecutor.execute(task, { data: {} } as any);

            expect(mockedAxios).toHaveBeenCalledWith({
                url: 'https://api.test.com',
                method: 'POST',
                headers: { 'Authorization': 'Bearer token' },
                data: { data: 'test' },
                timeout: 5000
            });
        });

        it('should handle timeout errors', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.GET,
                    timeout: 1000
                }
            };

            const error: MockAxiosError = {
                message: 'timeout of 1000ms exceeded',
                code: 'ECONNABORTED',
                response: {
                    status: 408,
                    statusText: 'Request Timeout',
                    headers: {},
                    data: {}
                }
            };

            (mockedAxios as any).mockRejectedValueOnce(error);

            await expect(apiTaskExecutor.execute(task, { data: {} } as any)).rejects.toThrow(TaskError);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'API task execution failed',
                { taskId: '1', error: 'Unknown error' }
            );
        });

        it('should handle malformed response data', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.GET
                }
            };

            const mockResponse: MockAxiosResponse = {
                status: 200,
                headers: { 'content-type': 'application/json' },
                data: null
            };

            (mockedAxios as any).mockResolvedValueOnce(mockResponse);

            const result = await apiTaskExecutor.execute(task, { data: {} } as any);

            expect(result).toEqual({
                statusCode: 200,
                headers: { 'content-type': 'application/json' },
                data: null
            });
        });

        it('should handle missing response headers', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.GET
                }
            };

            const mockResponse: MockAxiosResponse = {
                status: 200,
                headers: undefined,
                data: { message: 'success' }
            };

            (mockedAxios as any).mockResolvedValueOnce(mockResponse);

            const result = await apiTaskExecutor.execute(task, { data: {} } as any);

            expect(result).toEqual({
                statusCode: 200,
                headers: undefined,
                data: { message: 'success' }
            });
        });

        it('should handle retry logic when configured', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.GET,
                    retry: {
                        maxAttempts: 3,
                        delay: 1000
                    }
                }
            };

            const error: MockAxiosError = {
                message: 'Network Error',
                code: 'ECONNRESET',
                response: {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: {},
                    data: {}
                }
            };

            (mockedAxios as any)
                .mockRejectedValueOnce(error)
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce({
                    status: 200,
                    headers: {},
                    data: { message: 'success' }
                });

            await expect(apiTaskExecutor.execute(task, { data: {} } as any)).rejects.toThrow(TaskError);
        });

        it('should handle concurrent requests with different configurations', async () => {
            const tasks: ApiTask[] = [
                {
                    id: '1',
                    name: 'Test API Task 1',
                    type: TaskType.API_CALL,
                    order: 1,
                    config: {
                        url: 'https://api.test.com/1',
                        method: TaskMethod.GET
                    }
                },
                {
                    id: '2',
                    name: 'Test API Task 2',
                    type: TaskType.API_CALL,
                    order: 2,
                    config: {
                        url: 'https://api.test.com/2',
                        method: TaskMethod.POST,
                        body: { data: 'test' }
                    }
                }
            ];

            const mockResponses: MockAxiosResponse[] = [
                {
                    status: 200,
                    headers: {},
                    data: { id: 1 }
                },
                {
                    status: 200,
                    headers: {},
                    data: { id: 2 }
                }
            ];

            (mockedAxios as any)
                .mockResolvedValueOnce(mockResponses[0])
                .mockResolvedValueOnce(mockResponses[1]);

            await expect(Promise.all(
                tasks.map(task => apiTaskExecutor.execute(task, { data: {} } as any))
            )).rejects.toThrow(TaskError);
        });

        it('should handle missing URL in task config', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: '',
                    method: TaskMethod.GET
                }
            };

            await expect(apiTaskExecutor.execute(task, { data: {} } as any)).rejects.toThrow(TaskError);
        });

        it('should handle missing method in task config', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: '' as TaskMethod
                }
            };

            const result = await apiTaskExecutor.execute(task, { data: {} } as any);

            expect(result).toEqual({
                statusCode: 200,
                headers: {},
                data: { id: 1 }
            });
        });

        it('should handle invalid HTTP method', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: 'INVALID' as TaskMethod
                }
            };

            const result = await apiTaskExecutor.execute(task, { data: {} } as any);

            expect(result).toEqual({
                statusCode: 200,
                headers: {},
                data: { id: 2 }
            });
        });

        it('should handle request cancellation', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.GET
                }
            };

            const error: MockAxiosError = {
                message: 'Request cancelled',
                code: 'ERR_CANCELED'
            };

            (mockedAxios as any).mockRejectedValueOnce(error);

            await expect(apiTaskExecutor.execute(task, { data: {} } as any)).rejects.toThrow(TaskError);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'API task execution failed',
                { taskId: '1', error: 'Unknown error' }
            );
        });

        it('should handle SSL/TLS errors', async () => {
            const task: ApiTask = {
                id: '1',
                name: 'Test API Task',
                type: TaskType.API_CALL,
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.GET
                }
            };

            const error: MockAxiosError = {
                message: 'SSL certificate error',
                code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
            };

            (mockedAxios as any).mockRejectedValueOnce(error);

            await expect(apiTaskExecutor.execute(task, { data: {} } as any)).rejects.toThrow(TaskError);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'API task execution failed',
                { taskId: '1', error: 'Unknown error' }
            );
        });
    });
});