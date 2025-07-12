import { TaskType } from '../enums/task.enum';
import { AlertTask } from './alert.interface';

describe('AlertTask Interface', () => {
    it('should have required properties', () => {
        const alertTask: AlertTask = {
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

        expect(alertTask).toHaveProperty('id');
        expect(alertTask).toHaveProperty('name');
        expect(alertTask).toHaveProperty('type');
        expect(alertTask).toHaveProperty('order');
        expect(alertTask).toHaveProperty('config');
    });

    it('should have correct task type', () => {
        const alertTask: AlertTask = {
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

        expect(alertTask.type).toBe(TaskType.ALERT);
    });

    it('should have required config properties', () => {
        const alertTask: AlertTask = {
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

        expect(alertTask.config).toHaveProperty('source');
        expect(alertTask.config).toHaveProperty('sourceId');
        expect(alertTask.config).toHaveProperty('alertMessage');
        expect(alertTask.config).toHaveProperty('isActive');
        expect(alertTask.config).toHaveProperty('status');
    });

    it('should allow optional category property', () => {
        const alertTask: AlertTask = {
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

        expect(alertTask.config).toHaveProperty('category');
        expect(alertTask.config.category).toBe('test-category');
    });
}); 