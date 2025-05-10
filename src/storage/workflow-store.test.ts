import { MongoWorkflowStore } from './workflow-store';
import { Workflow } from '../core/types';
import { ILogger } from '../core/interfaces/logger.interface';

describe('MongoWorkflowStore', () => {
    let store: MongoWorkflowStore;
    let mockCollection: any;
    let mockLogger: ILogger;

    beforeEach(() => {
        mockCollection = {
            findOne: jest.fn()
        };

        mockLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };

        store = new MongoWorkflowStore(mockCollection, mockLogger);
    });

    describe('findWorkflowByTrigger', () => {
        it('should return workflow when found', async () => {
            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'TestClass.testMethod',
                tasks: [],
                validations: []
            };

            mockCollection.findOne.mockResolvedValueOnce(workflow);

            const result = await store.findWorkflowByTrigger('TestClass', 'testMethod');

            expect(result).toEqual(workflow);
            expect(mockCollection.findOne).toHaveBeenCalledWith({
                trigger: 'TestClass.testMethod'
            });
        });

        it('should return null when no workflow found', async () => {
            mockCollection.findOne.mockResolvedValueOnce(null);

            const result = await store.findWorkflowByTrigger('TestClass', 'testMethod');

            expect(result).toBeNull();
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'No workflow found for trigger',
                { trigger: 'TestClass.testMethod' }
            );
        });

        it('should handle database errors', async () => {
            const error = new Error('Database error');
            mockCollection.findOne.mockRejectedValueOnce(error);

            await expect(store.findWorkflowByTrigger('TestClass', 'testMethod'))
                .rejects
                .toThrow('Database error');

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error finding workflow by trigger',
                {
                    className: 'TestClass',
                    methodName: 'testMethod',
                    error: 'Database error'
                }
            );
        });
    });
}); 