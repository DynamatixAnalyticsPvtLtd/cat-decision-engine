import { TaskValidationService } from './task-validation.service';
import { BaseTask } from '../../tasks/base/task.interface';
import { ApiTask } from '../../tasks/api/api-task.interface';
import { TaskType, TaskMethod } from '../../tasks/enums/task.enum';
import { TaskError } from '../errors/workflow-error';

describe('TaskValidationService', () => {
    let validationService: TaskValidationService;

    beforeEach(() => {
        validationService = new TaskValidationService();
    });

    describe('validateTask', () => {
        describe('Base Task Validation', () => {
            it('should validate task with required fields', () => {
                const task: BaseTask = {
                    id: '1',
                    type: TaskType.API_CALL,
                    order: 1
                };

                expect(() => validationService.validateTask(task)).not.toThrow();
            });

            it('should throw error when task ID is missing', () => {
                const task = {
                    type: TaskType.API_CALL,
                    order: 1
                } as BaseTask;

                expect(() => validationService.validateTask(task)).toThrow(TaskError);
                expect(() => validationService.validateTask(task)).toThrow('Task ID is required');
            });

            it('should throw error when task type is missing', () => {
                const task = {
                    id: '1',
                    order: 1
                } as BaseTask;

                expect(() => validationService.validateTask(task)).toThrow(TaskError);
                expect(() => validationService.validateTask(task)).toThrow('Task type is required');
            });

            it('should throw error when task order is not a number', () => {
                const task = {
                    id: '1',
                    type: TaskType.API_CALL,
                    order: '1' as any
                };

                expect(() => validationService.validateTask(task)).toThrow(TaskError);
                expect(() => validationService.validateTask(task)).toThrow('Task order must be a number');
            });

            it('should throw error for unsupported task type', () => {
                const task = {
                    id: '1',
                    type: 'unsupported' as TaskType,
                    order: 1
                };

                expect(() => validationService.validateTask(task)).toThrow(TaskError);
                expect(() => validationService.validateTask(task)).toThrow('Unsupported task type: unsupported');
            });
        });

        describe('API Task Validation', () => {
            it('should validate API task with required fields', () => {
                const task: ApiTask = {
                    id: '1',
                    type: TaskType.API_CALL,
                    order: 1,
                    config: {
                        url: 'https://api.test.com',
                        method: TaskMethod.GET
                    }
                };

                expect(() => validationService.validateTask(task)).not.toThrow();
            });

            it('should throw error when URL is missing', () => {
                const task: ApiTask = {
                    id: '1',
                    type: TaskType.API_CALL,
                    order: 1,
                    config: {
                        method: TaskMethod.GET
                    } as any
                };

                expect(() => validationService.validateTask(task)).toThrow(TaskError);
                expect(() => validationService.validateTask(task)).toThrow('URL is required for API task');
            });

            it('should throw error when method is missing', () => {
                const task: ApiTask = {
                    id: '1',
                    type: TaskType.API_CALL,
                    order: 1,
                    config: {
                        url: 'https://api.test.com'
                    } as any
                };

                expect(() => validationService.validateTask(task)).toThrow(TaskError);
                expect(() => validationService.validateTask(task)).toThrow('Method is required for API task');
            });

            it('should throw error for invalid URL format', () => {
                const task: ApiTask = {
                    id: '1',
                    type: TaskType.API_CALL,
                    order: 1,
                    config: {
                        url: 'invalid-url',
                        method: TaskMethod.GET
                    }
                };

                expect(() => validationService.validateTask(task)).toThrow(TaskError);
                expect(() => validationService.validateTask(task)).toThrow('Invalid URL format');
            });

            it('should throw error for invalid HTTP method', () => {
                const task: ApiTask = {
                    id: '1',
                    type: TaskType.API_CALL,
                    order: 1,
                    config: {
                        url: 'https://api.test.com',
                        method: 'INVALID' as TaskMethod
                    }
                };

                expect(() => validationService.validateTask(task)).toThrow(TaskError);
                expect(() => validationService.validateTask(task)).toThrow('Invalid HTTP method: INVALID');
            });

            it('should throw error for negative timeout', () => {
                const task: ApiTask = {
                    id: '1',
                    type: TaskType.API_CALL,
                    order: 1,
                    config: {
                        url: 'https://api.test.com',
                        method: TaskMethod.GET,
                        timeout: -1000
                    }
                };

                expect(() => validationService.validateTask(task)).toThrow(TaskError);
                expect(() => validationService.validateTask(task)).toThrow('Timeout must be a positive number');
            });

            it('should throw error for invalid retry configuration', () => {
                const task: ApiTask = {
                    id: '1',
                    type: TaskType.API_CALL,
                    order: 1,
                    config: {
                        url: 'https://api.test.com',
                        method: TaskMethod.GET,
                        retry: {
                            maxAttempts: 0,
                            delay: -1000
                        }
                    }
                };

                expect(() => validationService.validateTask(task)).toThrow(TaskError);
                expect(() => validationService.validateTask(task)).toThrow('Retry maxAttempts must be a positive number');
            });

            it('should validate task with valid retry configuration', () => {
                const task: ApiTask = {
                    id: '1',
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

                expect(() => validationService.validateTask(task)).not.toThrow();
            });

            it('should validate task with valid timeout', () => {
                const task: ApiTask = {
                    id: '1',
                    type: TaskType.API_CALL,
                    order: 1,
                    config: {
                        url: 'https://api.test.com',
                        method: TaskMethod.GET,
                        timeout: 5000
                    }
                };

                expect(() => validationService.validateTask(task)).not.toThrow();
            });
        });
    });
}); 