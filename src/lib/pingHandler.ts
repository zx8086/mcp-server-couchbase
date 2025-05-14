/* src/lib/pingHandler.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "./logger";
import type { capellaConn } from "../types";

export function registerPingHandlers(server: McpServer, capellaConn: capellaConn): void {
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
              status: "error",
              message: "Server is running but not connected to a database.",
            };
          }
          await capellaConn.defaultBucket.ping();
          return {
            status: "ok",
            message: "Server and database are healthy",
          };
        } catch (error) {
          logger.warn("Database ping failed", { error });
          return {
            status: "error",
            message: "Server is running but database connection failed",
            error: error instanceof Error ? error.message : String(error),
          };
        }
      } catch (error) {
        logger.error("Error during ping", { error });
        return {
          status: "error",
          message: "Server error during ping",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );

  logger.info("Ping handlers registered successfully");
}
