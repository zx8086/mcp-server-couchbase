// src/config.ts

import path from "path";

export const config = {
    server: {
        name: Bun.env.MCP_SERVER_NAME || "couchbase-mcp-server",
        version: "1.0.0",
        port: parseInt(Bun.env.FASTMCP_PORT || "8080"),
        transportMode: Bun.env.MCP_TRANSPORT || "stdio",
        readOnlyQueryMode: Bun.env.READ_ONLY_QUERY_MODE !== "false"
    },
    log: {
        level: Bun.env.LOG_LEVEL || "info"
    },
    couchbase: {
        url: Bun.env.COUCHBASE_URL,
        username: Bun.env.COUCHBASE_USERNAME,
        password: Bun.env.COUCHBASE_PASSWORD,
        bucket: Bun.env.COUCHBASE_BUCKET,
        scope: Bun.env.COUCHBASE_SCOPE,
        collection: Bun.env.COUCHBASE_COLLECTION
    },
    paths: {
        root: Bun.env.CN_ROOT || path.resolve(__dirname, ".."),
        cxxcbcCache: Bun.env.CXXCBC_CACHE_DIR || "/usr/src/app/deps/couchbase-cxx-cache"
    }
};