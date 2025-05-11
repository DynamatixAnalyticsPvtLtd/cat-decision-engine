import { MongoWorkflowStore } from '../../storage/workflow-store';
import { MongoLogger } from '../logging/mongo-logger';
import { MongoClient } from 'mongodb';

let workflowStore: MongoWorkflowStore | null = null;

export async function getWorkflowStore() {
    if (!workflowStore) {
        const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
        await client.connect();
        const db = client.db(process.env.DB_NAME || 'workflow-engine');
        const collection = db.collection('workflows');
        const logger = new MongoLogger();
        workflowStore = new MongoWorkflowStore(collection, logger);
    }
    return workflowStore;
} 