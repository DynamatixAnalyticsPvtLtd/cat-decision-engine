interface Config {
    mongodb: {
        uri: string;
        database: string;
        collection: string;
    };
}

export function getConfig(): Config {
    return {
        mongodb: {
            uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
            database: process.env.MONGODB_DATABASE || 'workflow-engine',
            collection: process.env.MONGODB_COLLECTION || 'workflow_logs'
        }
    };
} 