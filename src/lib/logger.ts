/* src/lib/logger.ts */

import { createLogger, format, transports } from "winston";
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
let loggerInstance: ReturnType<typeof createLogger> | null = null;

function getLogger() {
  if (!loggerInstance) {
    loggerInstance = createLogger(getLoggerConfig());
  }
  return loggerInstance;
}

export const logger = {
  info: (message: string, meta?: any) => {
    getLogger().info(message, meta);
  },
  error: (message: string, meta?: any) => {
    getLogger().error(message, meta);
  },
  warn: (message: string, meta?: any) => {
    getLogger().warn(message, meta);
  },
  debug: (message: string, meta?: any) => {
    getLogger().debug(message, meta);
  },
  configure: (logLevel: string) => {
    getLogger().level = logLevel;
    getLogger().configure({
      ...getLoggerConfig(),
      level: logLevel
    });
  },
  child: (options: { context: string }) => {
    const childLogger = getLogger().child(options);
    return {
      info: (message: string, meta?: any) => childLogger.info(message, meta),
      error: (message: string, meta?: any) => childLogger.error(message, meta),
      warn: (message: string, meta?: any) => childLogger.warn(message, meta),
      debug: (message: string, meta?: any) => childLogger.debug(message, meta),
    };
  }
};

export function configureLogger(logLevel: string) {
  logger.configure(logLevel);
}

export function createContextLogger(context: string) {
  // Avoid top-level logger.child usage
  const { logger } = require("./logger");
  return logger.child({ context });
}
