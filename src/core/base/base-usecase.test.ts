import { BaseUseCase, WorkflowIntercept } from './base-usecase';
import { WorkflowEngine } from '../workflow-engine';
import { IWorkflowStore } from '../../storage/workflow-store';
import { Workflow } from '../types';
import { DefaultLogger } from '../logging/default-logger';

// Mock dependencies
jest.mock('../workflow-engine');
jest.mock('../../storage/workflow-store');

describe('BaseUseCase', () => {
    class TestUseCase extends BaseUseCase {
        protected async handle(input: any): Promise<any> {
            return { processed: input };
        }
    }

    let useCase: TestUseCase;
    let mockWorkflowStore: jest.Mocked<IWorkflowStore>;
    let mockLogger: jest.Mocked<DefaultLogger>;

    beforeEach(() => {
        mockWorkflowStore = {
            findWorkflowByTrigger: jest.fn()
        } as any;

        mockLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        } as any;

        useCase = new TestUseCase(mockWorkflowStore, mockLogger);
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should execute original method when no workflow found', async () => {
            mockWorkflowStore.findWorkflowByTrigger.mockResolvedValueOnce(null);

            const input = { test: 'data' };
            const result = await useCase.execute(input);

            expect(result).toEqual({ processed: input });
            expect(mockWorkflowStore.findWorkflowByTrigger).toHaveBeenCalledWith(
                'TestUseCase',
                'execute'
            );
        });

        it('should execute workflow when found', async () => {
            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'TestUseCase.execute',
                tasks: [],
                validations: []
            };

            mockWorkflowStore.findWorkflowByTrigger.mockResolvedValueOnce(workflow);

            const mockWorkflowEngine = {
                executeWorkflow: jest.fn().mockResolvedValueOnce({
                    success: true,
                    context: {},
                    validationResults: [],
                    taskResults: []
                })
            };

            (WorkflowEngine as jest.Mock).mockImplementationOnce(() => mockWorkflowEngine);

            const input = { test: 'data' };
            const result = await useCase.execute(input);

            expect(result).toEqual({ processed: input });
            expect(mockWorkflowEngine.executeWorkflow).toHaveBeenCalledWith(
                workflow,
                expect.objectContaining({
                    className: 'TestUseCase',
                    methodName: 'execute',
                    input
                })
            );
        });

        it('should throw error when workflow execution fails', async () => {
            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'TestUseCase.execute',
                tasks: [],
                validations: []
            };

            mockWorkflowStore.findWorkflowByTrigger.mockResolvedValueOnce(workflow);

            const mockWorkflowEngine = {
                executeWorkflow: jest.fn().mockResolvedValueOnce({
                    success: false,
                    error: 'Workflow failed',
                    context: {},
                    validationResults: [],
                    taskResults: []
                })
            };

            (WorkflowEngine as jest.Mock).mockImplementationOnce(() => mockWorkflowEngine);

            const input = { test: 'data' };
            await expect(useCase.execute(input)).rejects.toThrow('Workflow failed');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Workflow execution failed',
                {
                    workflowId: workflow.id,
                    error: 'Workflow failed'
                }
            );
        });

        it('should handle workflow store errors', async () => {
            const error = new Error('Store error');
            mockWorkflowStore.findWorkflowByTrigger.mockRejectedValueOnce(error);

            const input = { test: 'data' };
            await expect(useCase.execute(input)).rejects.toThrow('Store error');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error in workflow interceptor',
                {
                    error: 'Store error',
                    className: 'TestUseCase',
                    methodName: 'execute'
                }
            );
        });
    });
});

describe('WorkflowIntercept Decorator', () => {
    class TestClass {
        private workflowStore: IWorkflowStore;
        private logger: DefaultLogger;

        constructor() {
            this.workflowStore = {
                findWorkflowByTrigger: jest.fn().mockResolvedValue(null)
            } as any;
            this.logger = new DefaultLogger();
        }

        @WorkflowIntercept()
        async testMethod(input: any): Promise<any> {
            return { original: input };
        }
    }

    let instance: TestClass;

    beforeEach(() => {
        instance = new TestClass();
        jest.clearAllMocks();
    });

    it('should preserve original method functionality', async () => {
        const input = { test: 'data' };
        const result = await instance.testMethod(input);

        expect(result).toEqual({ original: input });
    });

    it('should create workflow engine instance', async () => {
        await instance.testMethod({});

        expect(WorkflowEngine).toHaveBeenCalled();
    });
}); 