/* src/lib/pingHandler.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "./logger";
import type { CapellaConn } from "../types";

export function registerPingHandlers(server: McpServer, capellaConn: CapellaConn): void {
  server.tool(
    "ping",
    "Checks the server and database connection status",
    {},
    async () => {
      try {
        logger.info("Protocol ping received");

        // Check database connection
        try {
          if (!capellaConn.defaultBucket) {
            return {
              content: [
                {
                  type: "text",
                  text: "Server is running but not connected to a database."
                }
              ]
            };
          }
          await capellaConn.defaultBucket.ping();
          return {
            content: [
              {
                type: "text",
                text: "Server and database are healthy"
              }
            ]
          };
        } catch (error) {
          logger.warn("Database ping failed", { error });
          return {
            content: [
              {
                type: "text",
                text: `Server is running but database connection failed. ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
      } catch (error) {
        logger.error("Error during ping", { error });
        return {
          content: [
            {
              type: "text",
              text: `Server error during ping. ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );

  logger.info("Ping handlers registered successfully");
}
