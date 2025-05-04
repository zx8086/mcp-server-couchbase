// src/lib/logger.ts

import { createLogger, format, transports } from 'winston';
import { config } from '../config';

export const logger = createLogger({
    level: config.log.level,
    format: format.combine(
        format.timestamp(),
        format.printf(({ level, message, timestamp }) => {
            return `${timestamp} - ${config.server.name} - ${level}: ${message}`;
        })
    ),
    transports: [new transports.Console({ stderrLevels: ['info', 'warn', 'error', 'debug', 'verbose', 'silly'] })]
});
