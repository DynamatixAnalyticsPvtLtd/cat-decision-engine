import { WorkflowEngine } from './workflow-engine';
import { Workflow, Task } from './types';
import { TaskType, TaskMethod } from '../tasks/enums/task.enum';
import { TaskExecutor } from './executors/task-executor';
import { DefaultLogger } from './logging/default-logger';

describe('WorkflowEngine Context', () => {
    let workflowEngine: WorkflowEngine;
    let taskExecutor: TaskExecutor;
    let logger: DefaultLogger;

    beforeEach(() => {
        logger = new DefaultLogger();
        taskExecutor = new TaskExecutor(logger);
        workflowEngine = new WorkflowEngine();
    });

    describe('execute', () => {
        it('should maintain context between tasks', async () => {
            const task1: Task = {
                id: 'task-1',
                type: TaskType.API_CALL,
                name: 'First Task',
                order: 1,
                config: {
                    url: 'https://api.test.com/1',
                    method: TaskMethod.GET
                }
            };

            const task2: Task = {
                id: 'task-2',
                type: TaskType.API_CALL,
                name: 'Second Task',
                order: 2,
                config: {
                    url: 'https://api.test.com/2',
                    method: TaskMethod.POST,
                    body: { data: 'test' }
                }
            };

            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: [task1, task2]
            };

            const data = { test: 'value' };

            // Mock task executor
            jest.spyOn(taskExecutor, 'execute')
                .mockImplementationOnce(async () => ({
                    task: task1,
                    taskId: task1.id,
                    success: true,
                    output: { status: 'success' },
                    metadata: {
                        contextData: data
                    }
                }))
                .mockImplementationOnce(async () => ({
                    task: task2,
                    taskId: task2.id,
                    success: true,
                    output: { status: 'success' },
                    metadata: {
                        contextData: data
                    }
                }));

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: true,
                context: { data },
                validationResults: [],
                taskResults: [
                    {
                        task: task1,
                        taskId: task1.id,
                        success: true,
                        output: { status: 'success' },
                        metadata: {
                            contextData: data
                        }
                    },
                    {
                        task: task2,
                        taskId: task2.id,
                        success: true,
                        output: { status: 'success' },
                        metadata: {
                            contextData: data
                        }
                    }
                ]
            });

            // Verify task execution order and context
            expect(taskExecutor.execute).toHaveBeenCalledTimes(2);
            expect(taskExecutor.execute).toHaveBeenNthCalledWith(1, task1, expect.any(Object));
            expect(taskExecutor.execute).toHaveBeenNthCalledWith(2, task2, expect.any(Object));
        });

        it('should handle context updates from tasks', async () => {
            const task: Task = {
                id: 'task-1',
                type: TaskType.API_CALL,
                name: 'Test Task',
                order: 1,
                config: {
                    url: 'https://api.test.com',
                    method: TaskMethod.POST,
                    body: { data: 'test' }
                }
            };

            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: [task]
            };

            const data = { test: 'value' };

            // Mock task executor
            jest.spyOn(taskExecutor, 'execute').mockImplementationOnce(async () => ({
                task,
                taskId: task.id,
                success: true,
                output: { status: 'success', data: { updated: true } },
                metadata: {
                    contextData: data
                }
            }));

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: true,
                context: { data },
                validationResults: [],
                taskResults: [{
                    task,
                    taskId: task.id,
                    success: true,
                    output: { status: 'success', data: { updated: true } },
                    metadata: {
                        contextData: data
                    }
                }]
            });
        });

        it('should handle empty context', async () => {
            const workflow: Workflow = {
                id: 'test-workflow',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: []
            };

            const data = {};

            const result = await workflowEngine.execute(workflow, data);

            expect(result).toEqual({
                success: true,
                context: { data },
                validationResults: [],
                taskResults: []
            });
        });
    });
});