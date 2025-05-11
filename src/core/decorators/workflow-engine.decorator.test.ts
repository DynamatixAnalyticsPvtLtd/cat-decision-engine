import { LoggingWorkflowEngineDecorator, ValidationWorkflowEngineDecorator, ErrorHandlingWorkflowEngineDecorator, createDecoratedWorkflowEngine } from './workflow-engine.decorator';
import { Workflow } from '../types/workflow';
import { WorkflowResult } from '../types/workflow-result';
import { DefaultLogger } from '../logging/default-logger';
import { ValidationExecutor } from '../executors/validation-executor';
import { ValidationRule } from '../types/validation-rule';
import { IWorkflowEngine } from '../interfaces/workflow-engine.interface';
import { ValidationOnFail } from 'core/enums/validation.enum';

describe('WorkflowEngine Decorators', () => {
    let mockWorkflowEngine: jest.Mocked<IWorkflowEngine>;
    let logger: DefaultLogger;
    let validationExecutor: ValidationExecutor;
    let workflow: Workflow;
    let data: any;

    beforeEach(() => {
        mockWorkflowEngine = {
            execute: jest.fn()
        } as jest.Mocked<IWorkflowEngine>;

        logger = new DefaultLogger();
        validationExecutor = new ValidationExecutor(logger);

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
                context: { data },
                validationResults: [],
                taskResults: []
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
                context: { data },
                validationResults: [],
                taskResults: []
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

            const decoratedEngine = new ValidationWorkflowEngineDecorator(mockWorkflowEngine, validationExecutor);
            const result = await decoratedEngine.execute(workflow, data);

            expect(result.success).toBe(false);
            expect(result.validationResults).toHaveLength(1);
            expect(result.taskResults).toHaveLength(0);
            expect(mockWorkflowEngine.execute).not.toHaveBeenCalled();
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
        });
    });

    describe('createDecoratedWorkflowEngine', () => {
        it('should create a workflow engine with all decorators', async () => {
            const successResult: WorkflowResult = {
                success: true,
                context: { data },
                validationResults: [],
                taskResults: []
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
        });
    });
}); 