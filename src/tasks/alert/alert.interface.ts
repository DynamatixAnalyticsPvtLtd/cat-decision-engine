import { Types } from 'mongoose';
import { Task } from '../../core/types/task';
import { TaskType } from '../enums/task.enum';


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

export interface AlertTaskConfig {
    source: string;
    sourceId: string;
    contextId: string;
    alertMessage: string;
    category?: string;
    isActive: boolean;
    status: Alert['status'];
    validationId?: string;  // ID of the validation that triggers this alert
}

export interface AlertTask extends Task {
    type: TaskType.ALERT;
    config: AlertTaskConfig;
} 

export interface IAlertEngine {
    raiseAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert>;
} 