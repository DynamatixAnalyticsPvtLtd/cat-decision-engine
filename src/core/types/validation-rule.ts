import { ValidationType, ValidationOperator, ValidationOnFail } from '../enums/validation.enum';

export interface ValidationRule {
    name: string;
    condition: string;
    onFail: ValidationOnFail;
    fallback?: ValidationRule;
    message?: string;
} 