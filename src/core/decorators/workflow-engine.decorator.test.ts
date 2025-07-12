import { LoggingWorkflowEngineDecorator, ValidationWorkflowEngineDecorator, ErrorHandlingWorkflowEngineDecorator, createDecoratedWorkflowEngine } from './workflow-engine.decorator';
import { Workflow } from '../types/workflow';
import { WorkflowResult } from '../types/workflow-result';
import { DefaultLogger } from '../logging/default-logger';
import { ValidationExecutor } from '../executors/validation-executor';
import { ValidationRule } from '../types/validation-rule';
import { IWorkflowEngine } from '../interfaces/workflow-engine.interface';
import { ValidationOnFail } from '../enums/validation.enum';
import { WorkflowEngine } from '../workflow-engine';
import { ILogger } from '../logging/logger.interface';

jest.mock('../executors/validation-executor');

describe('WorkflowEngine Decorators', () => {
    let mockWorkflowEngine: jest.Mocked<IWorkflowEngine>;
    let validationExecutor: jest.Mocked<ValidationExecutor>;
    let logger: ILogger;
    let workflow: Workflow;
    let data: any;

    beforeEach(() => {
        // Create a mock logger
        logger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        } as unknown as jest.Mocked<ILogger>;
        validationExecutor = {
            execute: jest.fn()
        } as unknown as jest.Mocked<ValidationExecutor>;
        mockWorkflowEngine = {
            execute: jest.fn()
        } as unknown as jest.Mocked<IWorkflowEngine>;

        workflow = {
            id: 'test-workflow',
            name: 'Test Workflow',
            trigger: 'test',
            validations: [],
            tasks: []
        };

        data = { test: 'value' };
    });

    describe('LoggingWorkflowEngineDecorator', () => {
        it('should log workflow execution start and success', async () => {
            const successResult: WorkflowResult = {
                success: true,
                context: { data, workflowId: 'test-workflow', workflowName: 'Test Workflow', executionId: 'test-execution-id' },
                validationResults: [],
                taskResults: [],
                executionId: 'test-execution-id'
            };

            mockWorkflowEngine.execute.mockResolvedValueOnce(successResult);

            const decoratedEngine = new LoggingWorkflowEngineDecorator(mockWorkflowEngine, logger);
            const result = await decoratedEngine.execute(workflow, data);

            expect(result).toEqual(successResult);
            expect(mockWorkflowEngine.execute).toHaveBeenCalledWith(workflow, data);
        });

        it('should log workflow execution failure', async () => {
            const error = new Error('Test error');
            mockWorkflowEngine.execute.mockRejectedValueOnce(error);

            const decoratedEngine = new LoggingWorkflowEngineDecorator(mockWorkflowEngine, logger);
            await expect(decoratedEngine.execute(workflow, data)).rejects.toThrow(error);
        });
    });

    describe('ValidationWorkflowEngineDecorator', () => {
        it('should execute workflow when validations pass', async () => {
            const successResult: WorkflowResult = {
                success: true,
                context: { data, workflowId: 'test-workflow', workflowName: 'Test Workflow', executionId: 'test-execution-id' },
                validationResults: [],
                taskResults: [],
                executionId: 'test-execution-id'
            };

            mockWorkflowEngine.execute.mockResolvedValueOnce(successResult);

            const decoratedEngine = new ValidationWorkflowEngineDecorator(mockWorkflowEngine, validationExecutor);
            const result = await decoratedEngine.execute(workflow, data);

            expect(result).toEqual(successResult);
            expect(mockWorkflowEngine.execute).toHaveBeenCalledWith(workflow, data);
        });

        it('should return validation failure result when validations fail', async () => {
            const validationRule: ValidationRule = {
                id: 'test-validation',
                name: 'Age Validation',
                condition: 'data.age >= 18',
                message: 'Age must be at least 18',
                onFail: ValidationOnFail.CONTINUE
            };

            workflow.validations = [validationRule];
            data = { age: 16 };

            validationExecutor.execute.mockResolvedValueOnce({
                success: false,
                validationResults: [{
                    rule: validationRule,
                    success: false,
                    message: 'Age must be at least 18'
                }]
            } as any);

            const decoratedEngine = new ValidationWorkflowEngineDecorator(mockWorkflowEngine, validationExecutor);
            const result = await decoratedEngine.execute(workflow, data);

            expect(result.success).toBe(false);
            expect(result.validationResults).toHaveLength(1);
            expect(result.validationResults[0].success).toBe(false);
            expect(result.validationResults[0].message).toBe('Age must be at least 18');
            expect(result.taskResults).toHaveLength(0);
            expect(mockWorkflowEngine.execute).not.toHaveBeenCalled();
        });

        it('should skip validation when no validations are present', async () => {
            const successResult: WorkflowResult = {
                success: true,
                context: { data, workflowId: 'test-workflow', workflowName: 'Test Workflow', executionId: 'test-execution-id' },
                validationResults: [],
                taskResults: [],
                executionId: 'test-execution-id'
            };

            mockWorkflowEngine.execute.mockResolvedValueOnce(successResult);

            const decoratedEngine = new ValidationWorkflowEngineDecorator(mockWorkflowEngine, validationExecutor);
            const result = await decoratedEngine.execute(workflow, data);

            expect(result).toEqual(successResult);
            expect(validationExecutor.execute).not.toHaveBeenCalled();
            expect(mockWorkflowEngine.execute).toHaveBeenCalledWith(workflow, data);
        });
    });

    describe('ErrorHandlingWorkflowEngineDecorator', () => {
        it('should return error result when workflow execution fails', async () => {
            const error = new Error('Test error');
            mockWorkflowEngine.execute.mockRejectedValueOnce(error);

            const decoratedEngine = new ErrorHandlingWorkflowEngineDecorator(mockWorkflowEngine, logger);
            const result = await decoratedEngine.execute(workflow, data);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Test error');
            expect(result.taskResults).toHaveLength(0);
            expect(result.validationResults).toHaveLength(0);
            expect(result.context).toEqual({ data, workflowId: 'test-workflow', workflowName: 'Test Workflow', executionId: 'test-execution-id' });
            expect(result.executionId).toBeDefined();
        });

        it('should handle non-Error objects', async () => {
            mockWorkflowEngine.execute.mockRejectedValueOnce('String error');

            const decoratedEngine = new ErrorHandlingWorkflowEngineDecorator(mockWorkflowEngine, logger);
            const result = await decoratedEngine.execute(workflow, data);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown error');
            expect(result.taskResults).toHaveLength(0);
            expect(result.validationResults).toHaveLength(0);
            expect(result.context).toEqual({ data, workflowId: 'test-workflow', workflowName: 'Test Workflow', executionId: 'test-execution-id' });
            expect(result.executionId).toBeDefined();
        });
    });

    describe('createDecoratedWorkflowEngine', () => {
        it('should create a workflow engine with all decorators', async () => {
            const successResult: WorkflowResult = {
                success: true,
                context: { data, workflowId: 'test-workflow', workflowName: 'Test Workflow', executionId: 'test-execution-id' },
                validationResults: [],
                taskResults: [],
                executionId: 'test-execution-id'
            };

            mockWorkflowEngine.execute.mockResolvedValueOnce(successResult);

            const decoratedEngine = createDecoratedWorkflowEngine(mockWorkflowEngine, logger, validationExecutor);
            const result = await decoratedEngine.execute(workflow, data);

            expect(result).toEqual(successResult);
            expect(mockWorkflowEngine.execute).toHaveBeenCalledWith(workflow, data);
        });

        it('should handle errors through all decorators', async () => {
            const error = new Error('Test error');
            mockWorkflowEngine.execute.mockRejectedValueOnce(error);

            const decoratedEngine = createDecoratedWorkflowEngine(mockWorkflowEngine, logger, validationExecutor);
            const result = await decoratedEngine.execute(workflow, data);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Test error');
            expect(result.taskResults).toHaveLength(0);
            expect(result.validationResults).toHaveLength(0);
            expect(result.context).toEqual({ data, workflowId: 'test-workflow', workflowName: 'Test Workflow', executionId: 'test-execution-id' });
            expect(result.executionId).toBeDefined();
        });

        it('should handle validation failures through all decorators', async () => {
            const validationRule: ValidationRule = {
                id: 'test-validation',
                name: 'Age Validation',
                condition: 'data.age >= 18',
                message: 'Age must be at least 18',
                onFail: ValidationOnFail.CONTINUE
            };

            workflow.validations = [validationRule];
            data = { age: 16 };

            validationExecutor.execute.mockResolvedValueOnce({
                success: false,
                validationResults: [{
                    rule: validationRule,
                    success: false,
                    message: 'Age must be at least 18'
                }]
            } as any);

            const decoratedEngine = createDecoratedWorkflowEngine(mockWorkflowEngine, logger, validationExecutor);
            const result = await decoratedEngine.execute(workflow, data);

            expect(result.success).toBe(false);
            expect(result.validationResults).toHaveLength(1);
            expect(result.validationResults[0].success).toBe(false);
            expect(result.validationResults[0].message).toBe('Age must be at least 18');
            expect(result.taskResults).toHaveLength(0);
            expect(mockWorkflowEngine.execute).not.toHaveBeenCalled();
        });
    });
}); 