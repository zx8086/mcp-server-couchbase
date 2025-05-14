/* src/lib/logger.ts */

import { createLogger, format, transports, Logger } from "winston";
import { config } from "../config";

const DEFAULT_LOG_LEVEL = "info";

// Create a function to get the logger configuration
function getLoggerConfig() {
  // For test environment, use a simpler configuration
  if (process.env.NODE_ENV === 'test') {
    return {
      level: 'info',
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
        format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [TEST] ${level}: ${message}`;
        })
      ),
      transports: [
        new transports.Console({
          stderrLevels: ["info", "warn", "error", "debug", "verbose", "silly"],
        }),
      ],
    };
  }

  return {
    level: config.log?.level || DEFAULT_LOG_LEVEL,
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
      format.errors({ stack: true }),
      format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
      format.printf(({ level, message, timestamp, ...metadata }) => {
        const meta = Object.keys(metadata).length ? JSON.stringify(metadata) : "";
        return `${timestamp} [${config.server.name}] ${level}: ${message} ${meta}`;
      })
    ),
    defaultMeta: { service: config.server.name },
    transports: [
      new transports.Console({
        stderrLevels: ["info", "warn", "error", "debug", "verbose", "silly"],
      }),
    ],
  };
}

// Initialize logger lazily
let loggerInstance: Logger | null = null;

function getLogger() {
  if (!loggerInstance) {
    loggerInstance = createLogger(getLoggerConfig());
  }
  return loggerInstance;
}

export interface LoggerInterface {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

export const logger: LoggerInterface = {
  info: (message: string, meta?: Record<string, unknown>) => {
    getLogger().info(message, meta);
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    getLogger().error(message, meta);
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    getLogger().warn(message, meta);
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    getLogger().debug(message, meta);
  },
};

export function createContextLogger(context: string): LoggerInterface {
  const childLogger = getLogger().child({ context });
  return {
    info: (message: string, meta?: Record<string, unknown>) => childLogger.info(message, meta),
    error: (message: string, meta?: Record<string, unknown>) => childLogger.error(message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => childLogger.warn(message, meta),
    debug: (message: string, meta?: Record<string, unknown>) => childLogger.debug(message, meta),
  };
}

export function configureLogger(logLevel: string): void {
  getLogger().level = logLevel;
  getLogger().configure({
    ...getLoggerConfig(),
    level: logLevel
  });
}
