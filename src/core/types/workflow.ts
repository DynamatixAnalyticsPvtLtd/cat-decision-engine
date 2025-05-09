import { ValidationRule } from './validation-rule';
import { Task } from './task';

export interface Workflow {
    id: string;
    name: string;
    trigger?: string;
    tasks: Task[];
    validations: ValidationRule[];
} 