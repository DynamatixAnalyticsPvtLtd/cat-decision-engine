import { Alert, IAlertEngine } from '../../../tasks/alert/alert.interface';
// @ts-ignore
import { WorkflowAlertModel } from '@dynamatix/cat-shared/models';

export class AlertRepository implements IAlertEngine {
    async raiseAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert> {
        console.log('Attempting to save alert:', {
            ...alert,
            timestamp: new Date()
        });

        const newAlert = new WorkflowAlertModel({
            ...alert,
            timestamp: new Date()
        });

        const savedAlert = await newAlert.save();
        console.log('Alert saved successfully:', this.mapToAlert(savedAlert));
        return this.mapToAlert(savedAlert);
    }

    async findById(id: string): Promise<Alert | null> {
        const alert = await WorkflowAlertModel.findById(id);
        return alert ? this.mapToAlert(alert) : null;
    }

    async findBySourceAndSourceId(source: string, sourceId: string): Promise<Alert[]> {
        const alerts = await WorkflowAlertModel.find({ source, sourceId });
        return alerts.map(this.mapToAlert);
    }

    async findActiveAlerts(): Promise<Alert[]> {
        const alerts = await WorkflowAlertModel.find({ isActive: true });
        return alerts.map(this.mapToAlert);
    }

    async updateStatus(id: string, status: Alert['status']): Promise<Alert | null> {
        const alert = await WorkflowAlertModel.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );
        return alert ? this.mapToAlert(alert) : null;
    }

    async deactivateAlert(id: string): Promise<Alert | null> {
        const alert = await WorkflowAlertModel.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
        return alert ? this.mapToAlert(alert) : null;
    }

    private mapToAlert(document: any): Alert {
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