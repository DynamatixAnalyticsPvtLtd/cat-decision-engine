import { MongoWorkflowStore } from '../../storage/workflow-store';
import { MongoLogger } from '../logging/mongo-logger';
import { MongoClient } from 'mongodb';

let workflowStore: MongoWorkflowStore | null = null;

export async function getWorkflowStore() {
    if (!workflowStore) {
        const client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        const db = client.db(process.env.MONGODB_DATABASE);
        const collection = db.collection('workflowconfigs');
        const logger = new MongoLogger();
        workflowStore = new MongoWorkflowStore(collection, logger);
    }
    return workflowStore;
} 