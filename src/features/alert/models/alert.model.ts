import { Schema, model, Document, Types } from 'mongoose';
import { Alert } from '../../../tasks/alert/alert.interface';

export interface AlertDocument extends Omit<Alert, 'id'>, Document {
    _id: any;
}

const alertSchema = new Schema<AlertDocument>({
    source: {
        type: String,
        required: true,
        index: true
    },
    sourceId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    alertMessage: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: false,
        index: true
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
        index: true
    },
    status: {
        type: String,
        required: true,
        enum: ['raised', 'satisfied'],
        index: true
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound index for efficient querying
alertSchema.index({ source: 1, sourceId: 1 });
alertSchema.index({ status: 1, isActive: 1 });

export const AlertModel = model<AlertDocument>('Alert', alertSchema); 