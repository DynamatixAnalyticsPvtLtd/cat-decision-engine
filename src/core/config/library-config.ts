import dotenv from 'dotenv';

dotenv.config();

export interface LibraryConfig {
    mongodb: {
        uri: string;
        database?: string;
        collection?: string;
        options?: {
            useNewUrlParser?: boolean;
            useUnifiedTopology?: boolean;
        };
    };
    logging?: {
        level?: 'debug' | 'info' | 'warn' | 'error';
        enabled?: boolean;
        collection?: string;
    };
}

export function getConfig(): LibraryConfig {
    const mongodbUri = process.env.MONGODB_URI;
    if (!mongodbUri) {
        throw new Error('MONGODB_URI environment variable is required');
    }

    return {
        mongodb: {
            uri: mongodbUri,
            database: process.env.MONGODB_DATABASE || 'workflow-engine',
            collection: process.env.MONGODB_COLLECTION || 'workflows_logs',
            options: {
                useNewUrlParser: true,
                useUnifiedTopology: true
            }
        },
        logging: {
            level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
            enabled: process.env.LOG_ENABLED !== 'false',
            collection: process.env.LOG_COLLECTION || 'workflow_logs'
        }
    };
}

