import { Alert, IAlertEngine } from '../../../tasks/alert/alert.interface';
import { AlertService } from '../services/alert.service';
import { ILogger } from '../../../core/logging/logger.interface';
import { ObjectId } from 'mongodb';

export interface RaiseAlertInput {
    source: string;
    sourceId: string;
    alertMessage: string;
    category?: string;
    isActive?: boolean;
}

export interface RaiseAlertResult {
    success: boolean;
    alertId?: string;
    error?: string;
}

export class RaiseAlertUseCase {
    constructor(
        private readonly alertService: AlertService,
        private readonly logger: ILogger
    ) { }

    async execute(input: RaiseAlertInput): Promise<RaiseAlertResult> {
        try {
            this.logger.debug('Starting raise alert use case', {
                source: input.source,
                sourceId: input.sourceId
            });

            // Validate input
            this.validateInput(input);

            // Prepare alert data
            const alertData: Omit<Alert, 'id' | 'timestamp'> = {
                source: input.source,
                sourceId: new ObjectId(input.sourceId),
                alertMessage: input.alertMessage,
                category: input.category,
                isActive: input.isActive ?? true,
                status: 'raised'
            };

            // Raise alert
            const alert = await this.alertService.raiseAlert(alertData);

            this.logger.info('Alert raised successfully', {
                alertId: alert.id,
                source: alert.source,
                sourceId: alert.sourceId
            });

            return {
                success: true,
                alertId: alert.id
            };
        } catch (error) {
            this.logger.error('Failed to raise alert', {
                error: error instanceof Error ? error.message : 'Unknown error',
                source: input.source,
                sourceId: input.sourceId
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private validateInput(input: RaiseAlertInput): void {
        if (!input.source) {
            throw new Error('Source is required');
        }

        if (!input.sourceId) {
            throw new Error('SourceId is required');
        }

        if (!input.alertMessage) {
            throw new Error('Alert message is required');
        }

        // Additional business rules can be added here
        if (input.alertMessage.length > 1000) {
            throw new Error('Alert message is too long');
        }
    }
}