/* src/lib/logger.ts */

import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create a separate transport for logging to stderr
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Stream({
      stream: process.stderr,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export interface LoggerContext {
  context?: string;
  [key: string]: unknown;
}

export function createLogger(context: LoggerContext = {}) {
  return {
    info: (message: string, meta?: Record<string, unknown>) => 
      logger.info(message, { ...context, ...meta }),
    error: (message: string, meta?: Record<string, unknown>) => 
      logger.error(message, { ...context, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) => 
      logger.warn(message, { ...context, ...meta }),
    debug: (message: string, meta?: Record<string, unknown>) => 
      logger.debug(message, { ...context, ...meta })
  };
}

export function createContextLogger(contextName: string) {
  return createLogger({ context: contextName });
}

// Create default logger instances for different contexts
export const defaultLogger = createLogger({ context: 'Default' });
export const dbLogger = createLogger({ context: 'Database' });
export const apiLogger = createLogger({ context: 'API' });
export const resourceLogger = createLogger({ context: 'Resource' });

// Export the default logger as the main logger
export { defaultLogger as logger };
