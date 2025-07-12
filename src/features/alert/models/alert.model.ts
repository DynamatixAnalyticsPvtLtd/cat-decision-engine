import { Schema, model, Document, Types } from 'mongoose';
import { Alert } from '../../../tasks/alert/alert.interface';

export interface AlertDocument extends Omit<Alert, 'id'>, Document {
    _id: any;
}
