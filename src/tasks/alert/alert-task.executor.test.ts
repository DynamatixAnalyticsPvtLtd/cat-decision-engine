import { AlertTaskExecutor } from './alert-task-executor';
import { AlertTask, IAlertEngine } from './alert.interface';
import { TaskType } from '../enums/task.enum';
import { TaskError } from '../../core/errors/workflow-error';

// Mock the alert engine
jest.mock('../../features/alert/interfaces/alert.interface');

describe('AlertTaskExecutor', () => {
    let alertTaskExecutor: AlertTaskExecutor;
    let mockLogger: any;
    let mockAlertEngine: jest.Mocked<IAlertEngine>;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };

        mockAlertEngine = {
            raiseAlert: jest.fn()
        } as unknown as jest.Mocked<IAlertEngine>;

        alertTaskExecutor = new AlertTaskExecutor(mockLogger);
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should execute alert task successfully', async () => {
            const task: AlertTask = {
                id: 'test-alert-1',
                name: 'Test Alert Task',
                type: TaskType.ALERT,
                order: 1,
                config: {
                    source: 'test-source',
                    sourceId: 'test-source-id',
                    alertMessage: 'Test alert message',
                    isActive: true,
                    status: 'raised',
                    contextId: 'test-context-id',
                    formName: ['test-form-name']
                }
            };

            const mockAlertResult = {
                id: 'alert-1',
                source: 'test-source',
                sourceId: 'test-source-id',
                alertMessage: 'Test alert message',
                isActive: true,
                status: 'raised',
                timestamp: new Date()
            };

            mockAlertEngine.raiseAlert.mockResolvedValueOnce(mockAlertResult as any);

            const result = await alertTaskExecutor.execute(task, { data: {} } as any);

            expect(result).toEqual(mockAlertResult);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Executing alert task',
                { taskId: 'test-alert-1', source: 'test-source', sourceId: 'test-source-id' }
            );
            expect(mockAlertEngine.raiseAlert).toHaveBeenCalledWith({
                source: 'test-source',
                sourceId: 'test-source-id',
                alertMessage: 'Test alert message',
                isActive: true,
                status: 'raised'
            });
        });

        it('should handle alert task failure', async () => {
            const task: AlertTask = {
                id: 'test-alert-1',
                name: 'Test Alert Task',
                type: TaskType.ALERT,
                order: 1,
                config: {
                    source: 'test-source',
                    sourceId: 'test-source-id',
                    alertMessage: 'Test alert message',
                    isActive: true,
                    status: 'raised',
                    contextId: 'test-context-id',
                    formName: ['test-form-name']
                }
            };

            const errorMessage = 'Failed to raise alert';
            mockAlertEngine.raiseAlert.mockRejectedValueOnce(new Error(errorMessage));

            await expect(alertTaskExecutor.execute(task, { data: {} } as any)).rejects.toThrow(TaskError);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Alert task execution failed',
                { taskId: 'test-alert-1', error: errorMessage }
            );
        });

        it('should handle missing required config properties', async () => {
            const task: AlertTask = {
                id: 'test-alert-1',
                name: 'Test Alert Task',
                type: TaskType.ALERT,
                order: 1,
                config: {
                    source: '',
                    sourceId: '',
                    alertMessage: '',
                    isActive: true,
                    status: 'raised',
                    contextId: 'test-context-id',
                    formName: ['test-form-name']
                }
            };

            await expect(alertTaskExecutor.execute(task, { data: {} } as any)).rejects.toThrow(TaskError);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Alert task execution failed',
                { taskId: 'test-alert-1', error: 'Invalid alert configuration' }
            );
        });

        it('should handle optional category property', async () => {
            const task: AlertTask = {
                id: 'test-alert-1',
                name: 'Test Alert Task',
                type: TaskType.ALERT,
                order: 1,
                config: {
                    source: 'test-source',
                    sourceId: 'test-source-id',
                    alertMessage: 'Test alert message',
                    isActive: true,
                    status: 'raised',
                    category: 'test-category',
                    contextId: 'test-context-id',
                    formName: ['test-form-name']
                }
            };

            const mockAlertResult = {
                id: 'alert-1',
                source: 'test-source',
                sourceId: 'test-source-id',
                alertMessage: 'Test alert message',
                isActive: true,
                status: 'raised',
                category: 'test-category',
                timestamp: new Date()
            };

            mockAlertEngine.raiseAlert.mockResolvedValueOnce(mockAlertResult as any);

            const result = await alertTaskExecutor.execute(task, { data: {} } as any);

            expect(result).toEqual(mockAlertResult);
            expect(mockAlertEngine.raiseAlert).toHaveBeenCalledWith({
                source: 'test-source',
                sourceId: 'test-source-id',
                alertMessage: 'Test alert message',
                isActive: true,
                status: 'raised',
                category: 'test-category'
            });
        });
    });
}); 