import { Workflow } from '../core/types';
import { ILogger } from '../core/interfaces/logger.interface';

export interface IWorkflowStore {
    findWorkflowByTrigger(className: string, methodName: string): Promise<Workflow | null>;
}

export class MongoWorkflowStore implements IWorkflowStore {
    constructor(
        private readonly collection: any, // MongoDB collection
        private readonly logger: ILogger
    ) { }

    async findWorkflowByTrigger(className: string, methodName: string): Promise<Workflow | null> {
        try {
            const trigger = `${className}.${methodName}`;
            const workflow = await this.collection.findOne({ trigger });

            if (!workflow) {
                this.logger.debug('No workflow found for trigger', { trigger });
                return null;
            }

            this.logger.debug('Found workflow for trigger', { trigger, workflowId: workflow.id });
            return workflow;
        } catch (error) {
            this.logger.error('Error finding workflow by trigger', {
                className,
                methodName,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
} 