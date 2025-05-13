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
            pingLogger.info("Ping request received");

            try {
                if (bucket) {
                    try {
                        // Try to ping the Couchbase cluster
                        await bucket.ping();
                        pingLogger.info("Ping successful with database connection");

                        return {
                            content: [{
                                type: "text",
                                text: "Pong! MCP Server is running and connected to Couchbase."
                            }]
                        };
                    } catch (dbError) {
                        pingLogger.warn("Database ping failed", { error: dbError });

                        return {
                            content: [{
                                type: "text",
                                text: `Pong! MCP Server is running, but Couchbase connection test failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
                            }]
                        };
                    }
                } else {
                    pingLogger.info("Ping successful without database connection");

                    return {
                        content: [{
                            type: "text",
                            text: "Pong! MCP Server is running but not connected to a database."
                        }]
                    };
                }
            } catch (error) {
                pingLogger.error("Error during ping", { error });

                return {
                    content: [{
                        type: "text",
                        text: `Pong! Server is running but encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`
                    }]
                };
            }
        }
    );
}