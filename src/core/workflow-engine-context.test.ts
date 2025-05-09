import { WorkflowEngine } from './workflow-engine';
import { Workflow, Task, WorkflowContext } from './types';
import { TaskType, TaskMethod } from './enums/task.enum';

describe('WorkflowEngine Context', () => {
    let workflowEngine: WorkflowEngine;

    beforeEach(() => {
        workflowEngine = new WorkflowEngine();
    });

    describe('executeWorkflow', () => {
        it('should throw error when context is not provided', async () => {
            const workflow: Workflow = {
                id: 'test-workflow-1',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: []
            };
            const context = null as unknown as WorkflowContext;

            await expect(workflowEngine.executeWorkflow(workflow, context))
                .rejects
                .toThrow('Context is required');
        });

        it('should execute empty workflow successfully', async () => {
            const workflow: Workflow = {
                id: 'test-workflow-2',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: []
            };
            const context: WorkflowContext = { data: { test: 'value' } };

            const result = await workflowEngine.executeWorkflow(workflow, context);

            expect(result).toEqual({
                success: true,
                context,
                validationResults: [],
                taskResults: []
            });
        });

        it('should update context with task output', async () => {
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
                id: 'test-workflow-3',
                name: 'Test Workflow',
                trigger: 'test',
                validations: [],
                tasks: [task]
            };

            const context: WorkflowContext = { data: { test: 'value' } };

            // Mock task to return output
            jest.spyOn(workflowEngine, 'executeTask').mockImplementationOnce(async () => ({
                task,
                taskId: task.id,
                success: true,
                output: {
                    statusCode: 200,
                    headers: {},
                    data: { result: 'success' }
                }
            }));

            const result = await workflowEngine.executeWorkflow(workflow, context);

            expect(result).toEqual({
                success: true,
                context: {
                    data: {
                        test: 'value',
                        'tasktask-1': {
                            statusCode: 200,
                            headers: {},
                            data: { result: 'success' }
                        }
                    }
                },
                validationResults: [],
                taskResults: [{
                    task,
                    taskId: task.id,
                    success: true,
                    output: {
                        statusCode: 200,
                        headers: {},
                        data: { result: 'success' }
                    }
                }]
            });
        });
    });
});