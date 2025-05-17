import mongoose from 'mongoose';
import { getConfig } from './library-config';

export async function initMongooseConnection() {
    const { mongodb } = getConfig();
    
    try {
        const mongoUrl = mongodb.uri;
        if (!mongoUrl) {
            throw new Error('MongoDB URI is not configured');
        }
        await mongoose.connect(mongoUrl);
        console.log('Mongoose connected to MongoDB');
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
    return mongoose.connection;
} 