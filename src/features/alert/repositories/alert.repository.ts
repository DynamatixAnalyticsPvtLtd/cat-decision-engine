import { Alert, IAlertEngine } from '../interfaces/alert.interface';
import { AlertModel, AlertDocument } from '../models/alert.model';
import { initMongooseConnection } from '../../../core/config/mongoose-connection';

export class AlertRepository implements IAlertEngine {
    async raiseAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert> {
        console.log('Attempting to save alert:', {
            ...alert,
            timestamp: new Date()
        });

        const newAlert = new AlertModel({
            ...alert,
            timestamp: new Date()
        });

        const savedAlert = await newAlert.save();
        console.log('Alert saved successfully:', this.mapToAlert(savedAlert));
        return this.mapToAlert(savedAlert);
    }

    async findById(id: string): Promise<Alert | null> {
        const alert = await AlertModel.findById(id);
        return alert ? this.mapToAlert(alert) : null;
    }

    async findBySourceAndSourceId(source: string, sourceId: string): Promise<Alert[]> {
        const alerts = await AlertModel.find({ source, sourceId });
        return alerts.map(this.mapToAlert);
    }

    async findActiveAlerts(): Promise<Alert[]> {
        const alerts = await AlertModel.find({ isActive: true });
        return alerts.map(this.mapToAlert);
    }

    async updateStatus(id: string, status: Alert['status']): Promise<Alert | null> {
        const alert = await AlertModel.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );
        return alert ? this.mapToAlert(alert) : null;
    }

    async deactivateAlert(id: string): Promise<Alert | null> {
        const alert = await AlertModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
        return alert ? this.mapToAlert(alert) : null;
    }

    private mapToAlert(document: AlertDocument): Alert {
        return {
            id: document._id.toString(),
            source: document.source,
            sourceId: document.sourceId,
            alertMessage: document.alertMessage,
            category: document.category,
            isActive: document.isActive,
            status: document.status,
            timestamp: document.timestamp
        };
    }
} 