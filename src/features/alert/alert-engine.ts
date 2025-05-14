import { Alert, IAlertEngine } from './interfaces/alert.interface';
import { AlertModel } from './models/alert.model';
import { initMongooseConnection } from '../../core/config/mongoose-connection';

export class AlertEngine implements IAlertEngine {
    async raiseAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert> {
        // Ensure MongoDB connection is established
        await initMongooseConnection();

        const newAlert = new AlertModel({
            ...alert,
            timestamp: new Date()
        });

        const savedAlert = await newAlert.save();
        
        // Convert to plain object to avoid mongoose document issues
        return {
            id: savedAlert._id.toString(),
            source: savedAlert.source,
            sourceId: savedAlert.sourceId,
            alertMessage: savedAlert.alertMessage,
            category: savedAlert.category,
            isActive: savedAlert.isActive,
            status: savedAlert.status,
            timestamp: savedAlert.timestamp
        };
    }
} 