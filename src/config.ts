/* src/config.ts */

import path from "path";
import { isTruthy } from "./lib/constants";
import type { EnvConfig } from "./types";

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
        name: env.MCP_SERVER_NAME || "couchbase-mcp-server",
        version: "1.0.0",
        port: parseInt(env.FASTMCP_PORT || "8080"),
        transportMode: env.MCP_TRANSPORT || "stdio",
        readOnlyQueryMode: isTruthy(env.READ_ONLY_QUERY_MODE)
    },
    log: {
        level: env.LOG_LEVEL || "info"
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
        cxxcbcCache: env.CXXCBC_CACHE_DIR || "/usr/src/app/deps/couchbase-cxx-cache"
    }
};

function validateRequiredConfig() {
    const requiredFields = [
        { key: 'couchbase.url', value: config.couchbase.url },
        { key: 'couchbase.username', value: config.couchbase.username },
        { key: 'couchbase.password', value: config.couchbase.password },
        { key: 'couchbase.bucket', value: config.couchbase.bucket },
    ];
    
    const missingFields = requiredFields
        .filter(field => !field.value)
        .map(field => field.key);
        
    if (missingFields.length > 0) {
        console.error(`Missing required configuration: ${missingFields.join(', ')}`);
        process.exit(1);
    }
}

validateRequiredConfig();