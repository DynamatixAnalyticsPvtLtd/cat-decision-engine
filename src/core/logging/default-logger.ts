import { ILogger } from './logger.interface';

export class DefaultLogger implements ILogger {
    debug(message: string, meta?: Record<string, any>): void {
        console.debug(`[DEBUG] ${message}`, meta || '');
    }

    info(message: string, meta?: Record<string, any>): void {
        console.info(`[INFO] ${message}`, meta || '');
    }

    warn(message: string, meta?: Record<string, any>): void {
        console.warn(`[WARN] ${message}`, meta || '');
    }

    error(message: string, meta?: Record<string, any>): void {
        console.error(`[ERROR] ${message}`, meta || '');
    }
} 