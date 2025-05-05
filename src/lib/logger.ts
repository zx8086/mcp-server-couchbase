/* src/lib/logger.ts */

import { createLogger, format, transports } from 'winston';
import { config } from '../config';

const basicLogger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}]: ${message}`;
        })
    ),
    transports: [new transports.Console()]
});

// Export the basic logger
export const logger = createLogger({
    level: config.log.level,
    format: format.combine(
        format.timestamp(),
        format.printf(({ level, message, timestamp }) => {
            return `${timestamp} - [${config.server.name}] - ${level}: ${message}`;
        })
    ),
    transports: [new transports.Console({ stderrLevels: ['info', 'warn', 'error', 'debug', 'verbose', 'silly'] })]
});

// Function to update logger configuration after config is loaded
export function configureLogger(logLevel: string) {
    logger.level = logLevel;
    logger.configure({
        level: logLevel,
        format: format.combine(
            format.timestamp(),
            format.printf(({ timestamp, level, message }) => {
                return `${timestamp} [${level}]: ${message}`;
            })
        ),
        transports: [new transports.Console()]
    });
}
