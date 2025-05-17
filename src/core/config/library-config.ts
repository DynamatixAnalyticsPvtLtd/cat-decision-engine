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

let config: LibraryConfig | null = null;

export function initializeLibrary(configuration: LibraryConfig) {
    if (!configuration.mongodb.uri) {
        throw new Error('MongoDB URI is required in configuration');
    }

    config = {
        mongodb: {
            uri: configuration.mongodb.uri,
            database: configuration.mongodb.database || 'workflow-engine',
            collection: configuration.mongodb.collection || 'workflows_logs',
            options: {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                ...configuration.mongodb.options
            }
        },
        logging: {
            level: 'info',
            enabled: true,
            collection: 'workflow_logs',
            ...configuration.logging
        }
    };
}

export function getConfig(): LibraryConfig {
    if (!config) {
        throw new Error('Library not initialized. Call initializeLibrary first.');
    }
    return config;
} 