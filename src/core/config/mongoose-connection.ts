import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export async function initMongooseConnection() {
  if (mongoose.connection.readyState !== 1) {
    try {
      const mongoUrl = process.env.MONGODB_URI || 'mongodb+srv://admin:admin@dheeraj-cluster.bcf6v.mongodb.net/workflow-engine?retryWrites=true&w=majority';
      await mongoose.connect(mongoUrl);
      console.log('Mongoose connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }
  return mongoose.connection;
} 