import { Alert, IAlertEngine } from '../interfaces/alert.interface';
import { AlertRepository } from '../repositories/alert.repository';
import { ILogger } from '../../../core/logging/logger.interface';
import { Types } from 'mongoose';

export class AlertService implements IAlertEngine {
    constructor(
        private readonly alertRepository: AlertRepository,
        private readonly logger: ILogger
    ) {}

    async raiseAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert> {
        try {
            this.logger.debug('Raising alert', { source: alert.source, sourceId: alert.sourceId });
            
            // Validate alert data
            this.validateAlert(alert);

            // Delegate to repository for MongoDB operations
            const savedAlert = await this.alertRepository.raiseAlert(alert);

            this.logger.info('Alert raised successfully', { 
                alertId: savedAlert.id,
                source: savedAlert.source,
                sourceId: savedAlert.sourceId
            });

            return savedAlert;
        } catch (error) {
            this.logger.error('Failed to raise alert', { 
                error: error instanceof Error ? error.message : 'Unknown error',
                source: alert.source,
                sourceId: alert.sourceId
            });
            throw error;
        }
    }

    private validateAlert(alert: Omit<Alert, 'id' | 'timestamp'>): void {
        if (!alert.source || typeof alert.source !== 'string') {
            throw new Error('Invalid alert source');
        }

        if (!alert.sourceId || !Types.ObjectId.isValid(alert.sourceId)) {
            throw new Error('Invalid alert sourceId - must be a valid ObjectId');
        }

        if (!alert.alertMessage || typeof alert.alertMessage !== 'string') {
            throw new Error('Invalid alert message');
        }

        if (typeof alert.isActive !== 'boolean') {
            throw new Error('Invalid alert isActive status');
        }

        if (!['raised', 'satisfied'].includes(alert.status)) {
            throw new Error('Invalid alert status');
        }
    }
} 