import { ILogger } from './logger.interface';
import { MongoClient, Collection } from 'mongodb';

export interface MongoLoggerConfig {
    mongoUrl?: string;
    database?: string;
    collection?: string;
}

export class MongoLogger implements ILogger {
    private client: MongoClient;
    private collection!: Collection;
    private isConnected: boolean = false;
    private connectionPromise: Promise<void>;

    constructor(config?: MongoLoggerConfig) {
        const mongoUrl = config?.mongoUrl || process.env.MONGODB_URI;
        if (!mongoUrl) {
            throw new Error('MongoDB URI is required. Set MONGODB_URI environment variable or pass mongoUrl in config.');
        }
        this.client = new MongoClient(mongoUrl);
        this.connectionPromise = this.connect(config);
    }

    private async connect(config?: MongoLoggerConfig) {
        try {
            await this.client.connect();
            this.isConnected = true;

            const dbName = config?.database || process.env.MONGODB_DATABASE || 'workflow-engine';
            const collectionName = config?.collection || process.env.MONGODB_COLLECTION || 'workflow_logs';

            this.collection = this.client.db(dbName).collection(collectionName);

            // Create indexes for better query performance
            await this.collection.createIndex({ timestamp: -1 });
            await this.collection.createIndex({ workflowId: 1 });
            await this.collection.createIndex({ level: 1 });
        } catch (error) {
            console.error('Failed to connect to MongoDB:', error);
            this.isConnected = false;
            throw error;
        }
    }

    private async ensureConnected() {
        if (!this.isConnected) {
            await this.connectionPromise;
        }
    }

    private async log(level: string, message: string, meta?: Record<string, any>): Promise<void> {
        try {
            await this.ensureConnected();

            const logEntry = {
                level,
                message,
                metadata: meta || {},
                timestamp: new Date(),
                workflowId: meta?.workflow?.id || meta?.workflowId || null,
                workflowName: meta?.workflow?.name || meta?.workflowName || null,
                executionId: meta?.executionId || null,
                status: meta?.status || null,
                duration: meta?.duration || null,
                validationResults: meta?.validationResults || [],
                taskResults: meta?.taskResults || [],
                error: meta?.error || null
            };

            await this.collection.insertOne(logEntry);
        } catch (error) {
            console.error('Failed to write log to MongoDB:', error);
            console.error('Falling back to console logging');
        }
    }

    async debug(message: string, meta?: Record<string, any>): Promise<void> {
        await this.log('DEBUG', message, meta);
        console.debug(`[DEBUG] ${message}`, meta || '');
    }

    async info(message: string, meta?: Record<string, any>): Promise<void> {
        await this.log('INFO', message, meta);
        console.info(`[INFO] ${message}`, meta || '');
    }

    async warn(message: string, meta?: Record<string, any>): Promise<void> {
        await this.log('WARN', message, meta);
        console.warn(`[WARN] ${message}`, meta || '');
    }

    async error(message: string, meta?: Record<string, any>): Promise<void> {
        await this.log('ERROR', message, meta);
        console.error(`[ERROR] ${message}`, meta || '');
    }

    // Query methods for audit trail
    async getWorkflowLogs(workflowId: string, limit: number = 100): Promise<any[]> {
        await this.ensureConnected();
        return this.collection.find({ workflowId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();
    }

    async getWorkflowStats(workflowId: string): Promise<any> {
        await this.ensureConnected();
        return this.collection.aggregate([
            { $match: { workflowId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgDuration: { $avg: '$duration' },
                    lastExecution: { $max: '$timestamp' }
                }
            }
        ]).toArray();
    }

    // Clean up resources when done
    async close(): Promise<void> {
        if (this.isConnected) {
            await this.client.close();
            this.isConnected = false;
        }
    }
} 