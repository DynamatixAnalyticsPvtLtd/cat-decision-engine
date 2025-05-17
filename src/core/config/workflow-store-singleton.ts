import { MongoWorkflowStore } from '../../storage/workflow-store';
import { MongoLogger } from '../logging/mongo-logger';
import { MongoClient } from 'mongodb';
import { getConfig } from './library-config';

let workflowStore: MongoWorkflowStore | null = null;

export async function getWorkflowStore() {
    if (!workflowStore) {
        const { mongodb } = getConfig();
        const client = new MongoClient(mongodb.uri);
        await client.connect();
        const db = client.db(mongodb.database);
        const collection = db.collection('workflows');
        const logger = new MongoLogger();
        workflowStore = new MongoWorkflowStore(collection, logger);
    }
    return workflowStore;
} 