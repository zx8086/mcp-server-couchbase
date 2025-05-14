/* src/config.ts */

import path from "path";
import { isTruthy } from "./lib/constants";
import type { EnvConfig } from "./types";
import { validateCouchbaseConfigOrExit } from "./lib/configValidation";

// Default configuration values
const DEFAULT_CONFIG = {
    SERVER: {
        NAME: "couchbase-mcp-server",
        VERSION: "1.0.0",
        PORT: 8080,
        TRANSPORT_MODE: "stdio"
    },
    LOG: {
        LEVEL: "info",
        FORMAT: "json",
        TIMESTAMP: true
    },
    PATHS: {
        CXXCBC_CACHE: "/usr/src/app/deps/couchbase-cxx-cache"
    }
} as const;

const env: EnvConfig = {
    MCP_SERVER_NAME: Bun.env.MCP_SERVER_NAME,
    FASTMCP_PORT: Bun.env.FASTMCP_PORT,
    MCP_TRANSPORT: Bun.env.MCP_TRANSPORT,
    READ_ONLY_QUERY_MODE: Bun.env.READ_ONLY_QUERY_MODE,
    LOG_LEVEL: Bun.env.LOG_LEVEL,
    COUCHBASE_URL: Bun.env.COUCHBASE_URL,
    COUCHBASE_USERNAME: Bun.env.COUCHBASE_USERNAME,
    COUCHBASE_PASSWORD: Bun.env.COUCHBASE_PASSWORD,
    COUCHBASE_BUCKET: Bun.env.COUCHBASE_BUCKET,
    COUCHBASE_SCOPE: Bun.env.COUCHBASE_SCOPE,
    COUCHBASE_COLLECTION: Bun.env.COUCHBASE_COLLECTION,
    CN_ROOT: Bun.env.CN_ROOT,
    CXXCBC_CACHE_DIR: Bun.env.CXXCBC_CACHE_DIR
};

export const config = {
    server: {
        name: env.MCP_SERVER_NAME || DEFAULT_CONFIG.SERVER.NAME,
        version: DEFAULT_CONFIG.SERVER.VERSION,
        port: parseInt(env.FASTMCP_PORT || DEFAULT_CONFIG.SERVER.PORT.toString()),
        transportMode: env.MCP_TRANSPORT || DEFAULT_CONFIG.SERVER.TRANSPORT_MODE,
        readOnlyQueryMode: isTruthy(env.READ_ONLY_QUERY_MODE)
    },
    log: {
        level: env.LOG_LEVEL || DEFAULT_CONFIG.LOG.LEVEL,
        format: DEFAULT_CONFIG.LOG.FORMAT,
        timestamp: DEFAULT_CONFIG.LOG.TIMESTAMP
    },
    couchbase: {
        url: env.COUCHBASE_URL,
        username: env.COUCHBASE_USERNAME,
        password: env.COUCHBASE_PASSWORD,
        bucket: env.COUCHBASE_BUCKET,
        scope: env.COUCHBASE_SCOPE,
        collection: env.COUCHBASE_COLLECTION
    },
    paths: {
        root: env.CN_ROOT || path.resolve(import.meta.dir, ".."),
        cxxcbcCache: env.CXXCBC_CACHE_DIR || DEFAULT_CONFIG.PATHS.CXXCBC_CACHE
    }
};

function validateRequiredConfig() {
    validateCouchbaseConfigOrExit(config.couchbase);
}

validateRequiredConfig();