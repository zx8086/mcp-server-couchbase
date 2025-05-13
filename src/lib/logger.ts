/* src/lib/logger.ts */

import { createLogger, format, transports } from "winston";
import { config } from "../config";

const structuredFormat = format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    const meta = Object.keys(metadata).length ? JSON.stringify(metadata) : "";
    return `${timestamp} [${config.server.name}] ${level}: ${message} ${meta}`;
  },
);

export const logger = createLogger({
  level: config.log.level,
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    format.errors({ stack: true }),
    format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
    structuredFormat,
  ),
  defaultMeta: { service: config.server.name },
  transports: [
    new transports.Console({
      stderrLevels: ["info", "warn", "error", "debug", "verbose", "silly"],
    }),
  ],
});

export function configureLogger(logLevel: string) {
  logger.level = logLevel;
  logger.configure({
    level: logLevel,
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
      format.errors({ stack: true }),
      format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
      structuredFormat,
    ),
    defaultMeta: { service: config.server.name },
    transports: [new transports.Console()],
  });
}

export function createContextLogger(context: string) {
  return {
    info: (message: string, meta?: any) =>
      logger.info(message, { context, ...meta }),
    error: (message: string, meta?: any) =>
      logger.error(message, { context, ...meta }),
    warn: (message: string, meta?: any) =>
      logger.warn(message, { context, ...meta }),
    debug: (message: string, meta?: any) =>
      logger.debug(message, { context, ...meta }),
  };
}
