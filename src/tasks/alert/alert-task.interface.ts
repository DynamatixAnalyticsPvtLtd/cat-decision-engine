import { Task } from '../../core/types/task';
import { TaskType } from '../enums/task.enum';
import { Alert } from '../../../features/alert/interfaces/alert.interface';

export interface AlertTaskConfig {
    source: string;
    sourceId: string;
    contextId: string;
    alertMessage: string;
    category?: string;
    isActive: boolean;
    status: Alert['status'];
}

export interface AlertTask extends Task {
    type: TaskType.ALERT;
    config: AlertTaskConfig;
} 