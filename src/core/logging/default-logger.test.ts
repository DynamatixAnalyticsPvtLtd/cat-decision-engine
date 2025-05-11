import { DefaultLogger } from './default-logger';

describe('DefaultLogger', () => {
    let logger: DefaultLogger;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        logger = new DefaultLogger();
        consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('debug', () => {
        it('should log debug message', () => {
            const message = 'Test debug message';
            logger.debug(message);

            expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test debug message', '');
        });

        it('should log debug message with metadata', () => {
            const message = 'Test debug message';
            const meta = { test: 'data' };
            logger.debug(message, meta);

            expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Test debug message', meta);
        });
    });

    describe('info', () => {
        beforeEach(() => {
            consoleSpy = jest.spyOn(console, 'info').mockImplementation();
        });

        it('should log info message', () => {
            const message = 'Test info message';
            logger.info(message);

            expect(consoleSpy).toHaveBeenCalledWith('[INFO] Test info message', '');
        });

        it('should log info message with metadata', () => {
            const message = 'Test info message';
            const meta = { test: 'data' };
            logger.info(message, meta);

            expect(consoleSpy).toHaveBeenCalledWith('[INFO] Test info message', meta);
        });
    });

    describe('warn', () => {
        beforeEach(() => {
            consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        });

        it('should log warning message', () => {
            const message = 'Test warning message';
            logger.warn(message);

            expect(consoleSpy).toHaveBeenCalledWith('[WARN] Test warning message', '');
        });

        it('should log warning message with metadata', () => {
            const message = 'Test warning message';
            const meta = { test: 'data' };
            logger.warn(message, meta);

            expect(consoleSpy).toHaveBeenCalledWith('[WARN] Test warning message', meta);
        });
    });

    describe('error', () => {
        beforeEach(() => {
            consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        });

        it('should log error message', () => {
            const message = 'Test error message';
            logger.error(message);

            expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Test error message', '');
        });

        it('should log error message with metadata', () => {
            const message = 'Test error message';
            const meta = { test: 'data' };
            logger.error(message, meta);

            expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Test error message', meta);
        });
    });
}); 