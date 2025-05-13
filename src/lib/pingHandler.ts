/* src/lib/pingHandler.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, createContextLogger } from "./logger";
import type { capellaConn } from "../types";

const pingLogger = createContextLogger("PingHandler");

export function registerPingHandlers(
  server: McpServer,
  capellaConn: capellaConn,
): void {
  // Register protocol-level ping as a tool
  server.tool(
    "ping",
    "Checks the server and database connection status",
    {},
    async () => {
      pingLogger.info("Protocol ping received");
      try {
        // Check connection status
        if (capellaConn.defaultBucket) {
          try {
            await capellaConn.defaultBucket.ping();
            return {
              content: [
                {
                  type: "text",
                  text: "Pong! Server is connected to Couchbase.",
                },
              ],
            };
          } catch (error) {
            pingLogger.warn("Database ping failed", { error });
            return {
              content: [
                {
                  type: "text",
                  text: "Pong! Server is running but database connection failed.",
                },
              ],
            };
          }
        } else {
          return {
            content: [
              {
                type: "text",
                text: "Pong! Server is running but not connected to a database.",
              },
            ],
          };
        }
      } catch (error) {
        pingLogger.error("Error during ping", { error });
        return {
          content: [
            {
              type: "text",
              text: "Pong! Server is running but encountered an error.",
            },
          ],
        };
      }
    },
  );

  pingLogger.info("Ping handlers registered successfully");
}
