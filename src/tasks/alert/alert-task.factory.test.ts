import { TaskFactory } from '../factory/task.factory';
import { TaskType } from '../enums/task.enum';
import { TaskError } from '../../core/errors/workflow-error';
import { AlertTaskExecutor } from './alert-task-executor';
import { TaskValidationService } from '../../core/services/task-validation.service';
import { DefaultLogger } from '../../core/logging/default-logger';
import { AlertTask, IAlertEngine } from './alert.interface';

jest.mock('./alert-task-executor');
jest.mock('../../core/services/task-validation.service');
jest.mock('../../../features/alert/interfaces/alert.interface');

describe('AlertTaskFactory', () => {
    let taskFactory: TaskFactory;
    let logger: DefaultLogger;
    let mockLogger: any;
    let mockAlertTaskExecutor: jest.Mocked<AlertTaskExecutor>;
    let mockValidationService: jest.Mocked<TaskValidationService>;
    let mockAlertEngine: jest.Mocked<IAlertEngine>;

    beforeEach(() => {
        logger = new DefaultLogger();

        mockLogger = {
            debug: jest.fn(),
            error: jest.fn()
        };

        mockAlertEngine = {
            raiseAlert: jest.fn()
        } as unknown as jest.Mocked<IAlertEngine>;

        mockAlertTaskExecutor = {
            execute: jest.fn()
        } as unknown as jest.Mocked<AlertTaskExecutor>;

        mockValidationService = {
            validateTask: jest.fn()
        } as unknown as jest.Mocked<TaskValidationService>;

        (AlertTaskExecutor as jest.Mock).mockImplementation(() => mockAlertTaskExecutor);
        (TaskValidationService as jest.Mock).mockImplementation(() => mockValidationService);

        taskFactory = new TaskFactory(mockLogger);
        jest.clearAllMocks();
    });

    describe('getTaskExecutor', () => {
        it('should return executor for alert task type', () => {
            const executor = taskFactory.getTaskExecutor(TaskType.ALERT);
            expect(executor).toBeDefined();
            expect(executor).toBe(mockAlertTaskExecutor);
        });
    });

    describe('executeTask', () => {
        const mockTask: AlertTask = {
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
                contextId: 'test-context-id'
            }
        };

        it('should execute alert task successfully', async () => {
            const mockContext = { data: { test: 'value' } };
            const mockOutput = {
                id: 'alert-1',
                source: 'test-source',
                sourceId: 'test-source-id',
                alertMessage: 'Test alert message',
                isActive: true,
                status: 'raised',
                timestamp: new Date()
            };

            mockValidationService.validateTask.mockImplementation(() => { });
            mockAlertTaskExecutor.execute.mockResolvedValueOnce(mockOutput as any);

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

        it('should handle validation errors', async () => {
            const mockContext = { data: { test: 'value' } };
            const validationError = new TaskError('Invalid alert configuration');

            mockValidationService.validateTask.mockImplementation(() => {
                throw validationError;
            });

            const result = await taskFactory.executeTask(mockTask, mockContext);

            expect(result).toEqual({
                task: mockTask,
                taskId: mockTask.id,
                success: false,
                error: 'Invalid alert configuration',
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Task execution failed',
                {
                    taskId: mockTask.id,
                    type: mockTask.type,
                    error: 'Invalid alert configuration'
                }
            );
        });

        it('should handle task execution errors', async () => {
            const mockContext = { data: { test: 'value' } };
            const executionError = new TaskError('Alert task execution failed');

            mockValidationService.validateTask.mockImplementation(() => { });
            mockAlertTaskExecutor.execute.mockRejectedValueOnce(executionError);

            const result = await taskFactory.executeTask(mockTask, mockContext);

            expect(result).toEqual({
                task: mockTask,
                taskId: mockTask.id,
                success: false,
                error: 'Alert task execution failed',
                metadata: {
                    contextData: mockContext.data
                }
            });
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Task execution failed',
                {
                    taskId: mockTask.id,
                    type: mockTask.type,
                    error: 'Alert task execution failed'
                }
            );
        });
    });
}); 