/* src/tools/pingServer.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, createContextLogger } from "../lib/logger";
import type { Bucket } from "couchbase";

const pingLogger = createContextLogger("PingServer");

export default function pingServer(server: McpServer, bucket: Bucket): void {
    server.tool(
        "ping",
        "Ping the MCP server to check connectivity",
        {},
        async () => {
            let debugInfo: Record<string, any> = {};
            pingLogger.info("Ping request received");
            try {
                debugInfo.bucketExists = !!bucket;
                if (bucket) {
                    await bucket.ping();
                    pingLogger.info("Ping successful with database connection");
                    debugInfo.ping = "success";
                    return {
                        content: [{
                            type: "text",
                            text: "Pong! MCP Server is running and connected to Couchbase."
                        }],
                        debug: debugInfo
                    };
                } else {
                    pingLogger.info("Ping successful without database connection");
                    debugInfo.ping = "no bucket";
                    return {
                        content: [{
                            type: "text",
                            text: "Pong! MCP Server is running but not connected to a database."
                        }],
                        debug: debugInfo
                    };
                }
            } catch (error) {
                pingLogger.error("Error during ping", { error });
                debugInfo.ping = "error";
                debugInfo.error = error instanceof Error ? error.message : String(error);
                return {
                    content: [{
                        type: "text",
                        text: `Pong! MCP Server is running but database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                    }],
                    debug: debugInfo
                };
            }
        }
    );

    pingLogger.info("Ping handler called");
} 