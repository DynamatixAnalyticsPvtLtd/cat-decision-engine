import { Types } from 'mongoose';

export interface Alert {
    id: string;
    source: string;
    sourceId: Types.ObjectId;
    alertMessage: string;
    category?: string;
    isActive: boolean;
    status: 'raised' | 'satisfied';
    timestamp: Date;
}

export interface IAlertEngine {
    raiseAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert>;
} 