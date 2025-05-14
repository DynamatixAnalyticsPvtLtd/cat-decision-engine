export interface Alert {
    id: string;
    source: string;
    sourceId: string;
    alertMessage: string;
    category?: string;
    isActive: boolean;
    status: 'raised' | 'satisfied';
    timestamp: Date;
}

export interface IAlertEngine {
    raiseAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert>;
} 