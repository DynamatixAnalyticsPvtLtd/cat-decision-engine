import { ValidationType, ValidationOperator, ValidationOnFail } from '../enums/validation.enum';

export interface ValidationRule {
    id: string;
    name: string;
    condition: string;
    message: string;
    onFail?: 'stop' | 'continue';
} 