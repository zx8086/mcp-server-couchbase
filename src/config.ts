/* src/config.ts */

import { z } from "zod";
import { createError } from "./lib/errors";

// Configuration schema
const ServerConfigSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  readOnlyQueryMode: z.boolean().default(true),
  maxQueryTimeout: z.number().min(1000).max(300000).default(30000),
  maxResultsPerQuery: z.number().min(1).max(10000).default(1000),
  transportMode: z.enum(['stdio', 'sse']).default('stdio'),
  port: z.number().default(8080),
});

const DatabaseConfigSchema = z.object({
  connectionString: z.string().url(),
  username: z.string().min(1),
  password: z.string().min(1),
  bucketName: z.string().min(1),
  defaultScope: z.string().default("_default"),
  maxConnections: z.number().min(1).max(100).default(10),
  connectionTimeout: z.number().min(1000).max(30000).default(5000),
});

const LoggingConfigSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]).default("info"),
  format: z.enum(["json", "text"]).default("json"),
  includeMetadata: z.boolean().default(true),
});

const ConfigSchema = z.object({
  server: ServerConfigSchema,
  database: DatabaseConfigSchema,
  logging: LoggingConfigSchema,
});

type Config = z.infer<typeof ConfigSchema>;

// Default configuration
const defaultConfig: Config = {
  server: {
    name: "mcp-server-couchbase",
    version: "1.0.0",
    readOnlyQueryMode: true,
    maxQueryTimeout: 30000,
    maxResultsPerQuery: 1000,
    transportMode: 'stdio',
    port: 8080,
  },
  database: {
    connectionString: "couchbase://localhost",
    username: "Administrator",
    password: "password",
    bucketName: "default",
    defaultScope: "_default",
    maxConnections: 10,
    connectionTimeout: 5000,
  },
  logging: {
    level: "info",
    format: "json",
    includeMetadata: true,
  },
};

// Environment variable mapping
const envVarMapping = {
  server: {
    name: "MCP_SERVER_NAME",
    version: "MCP_SERVER_VERSION",
    readOnlyQueryMode: "READ_ONLY_QUERY_MODE",
    maxQueryTimeout: "MCP_MAX_QUERY_TIMEOUT",
    maxResultsPerQuery: "MCP_MAX_RESULTS_PER_QUERY",
    transportMode: "MCP_TRANSPORT",
    port: "FASTMCP_PORT",
  },
  database: {
    connectionString: "COUCHBASE_URL",
    username: "COUCHBASE_USERNAME",
    password: "COUCHBASE_PASSWORD",
    bucketName: "COUCHBASE_BUCKET",
    defaultScope: "COUCHBASE_SCOPE",
    maxConnections: "COUCHBASE_MAX_CONNECTIONS",
    connectionTimeout: "COUCHBASE_CONNECTION_TIMEOUT",
  },
  logging: {
    level: "LOG_LEVEL",
    format: "LOG_FORMAT",
    includeMetadata: "LOG_INCLUDE_METADATA",
  },
};

// Load configuration from environment variables
function loadConfigFromEnv(): Partial<Config> {
  const config: Partial<Config> = {};

  // Helper function to parse environment variables
  const parseEnvVar = (value: string | undefined, type: "string" | "number" | "boolean"): unknown => {
    if (value === undefined) return undefined;
    if (type === "number") return Number(value);
    if (type === "boolean") return value.toLowerCase() === "true";
    return value;
  };

  // Load server config
  config.server = {
    name: parseEnvVar(process.env[envVarMapping.server.name], "string") as string || defaultConfig.server.name,
    version: parseEnvVar(process.env[envVarMapping.server.version], "string") as string || defaultConfig.server.version,
    readOnlyQueryMode: parseEnvVar(process.env[envVarMapping.server.readOnlyQueryMode], "boolean") as boolean ?? defaultConfig.server.readOnlyQueryMode,
    maxQueryTimeout: parseEnvVar(process.env[envVarMapping.server.maxQueryTimeout], "number") as number || defaultConfig.server.maxQueryTimeout,
    maxResultsPerQuery: parseEnvVar(process.env[envVarMapping.server.maxResultsPerQuery], "number") as number || defaultConfig.server.maxResultsPerQuery,
    transportMode: parseEnvVar(process.env[envVarMapping.server.transportMode], "string") as 'stdio' | 'sse' || defaultConfig.server.transportMode,
    port: parseEnvVar(process.env[envVarMapping.server.port], "number") as number || defaultConfig.server.port,
  };

  // Load database config
  config.database = {
    connectionString: parseEnvVar(process.env[envVarMapping.database.connectionString], "string") as string || defaultConfig.database.connectionString,
    username: parseEnvVar(process.env[envVarMapping.database.username], "string") as string || defaultConfig.database.username,
    password: parseEnvVar(process.env[envVarMapping.database.password], "string") as string || defaultConfig.database.password,
    bucketName: parseEnvVar(process.env[envVarMapping.database.bucketName], "string") as string || defaultConfig.database.bucketName,
    defaultScope: parseEnvVar(process.env[envVarMapping.database.defaultScope], "string") as string || defaultConfig.database.defaultScope,
    maxConnections: parseEnvVar(process.env[envVarMapping.database.maxConnections], "number") as number || defaultConfig.database.maxConnections,
    connectionTimeout: parseEnvVar(process.env[envVarMapping.database.connectionTimeout], "number") as number || defaultConfig.database.connectionTimeout,
  };

  // Load logging config
  config.logging = {
    level: parseEnvVar(process.env[envVarMapping.logging.level], "string") as "debug" | "info" | "warn" | "error" || defaultConfig.logging.level,
    format: parseEnvVar(process.env[envVarMapping.logging.format], "string") as "json" | "text" || defaultConfig.logging.format,
    includeMetadata: parseEnvVar(process.env[envVarMapping.logging.includeMetadata], "boolean") as boolean ?? defaultConfig.logging.includeMetadata,
  };

  return config;
}

// Initialize configuration
let config: Config;

try {
  // Merge default config with environment variables
  const envConfig = loadConfigFromEnv();
  const mergedConfig = {
    server: { ...defaultConfig.server, ...envConfig.server },
    database: { ...defaultConfig.database, ...envConfig.database },
    logging: { ...defaultConfig.logging, ...envConfig.logging },
  };

  // Validate and set configuration
  config = ConfigSchema.parse(mergedConfig);
  process.stderr.write("Configuration loaded successfully: " + JSON.stringify({
    server: {
      name: config.server.name,
      version: config.server.version,
      readOnlyQueryMode: config.server.readOnlyQueryMode,
      transportMode: config.server.transportMode,
      port: config.server.port,
    },
    database: {
      connectionString: config.database.connectionString,
      bucketName: config.database.bucketName,
    },
    logging: {
      level: config.logging.level,
      format: config.logging.format,
    },
  }, null, 2) + "\n");
} catch (error) {
  process.stderr.write("Configuration validation failed: " + (error instanceof Error ? error.message : String(error)) + "\n");
  throw new Error("Invalid configuration: " + (error instanceof Error ? error.message : String(error)));
}

export { config };