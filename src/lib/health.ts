/* src/lib/health.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { logger } from "./logger";
import type { capellaConn } from "../types";
import { createMcpError, MCP_ERROR_CODES } from "./mcpErrors";

const healthLogger = logger.child({ context: 'Health' });

export function registerHealthChecks(server: McpServer, capellaConn: capellaConn): void {
  // Basic health check
  server.tool(
    "health_check",
    "Check the health of the Couchbase MCP server",
    {},
    async () => {
      healthLogger.info('Running health check');
      
      try {
        // Check if we can connect to Couchbase
        if (!capellaConn.defaultBucket) {
          throw createMcpError(
            MCP_ERROR_CODES.INTERNAL_ERROR,
            'Couchbase connection not initialized'
          );
        }

        // Try a simple operation to verify connection
        await capellaConn.defaultBucket.collections().getAllScopes();
        
        return {
          content: [{
            type: "text",
            text: "✅ Server is healthy and connected to Couchbase"
          }]
        };
      } catch (error) {
        healthLogger.error('Health check failed', { error });
        throw error;
      }
    }
  );

  // Detailed diagnostics
  server.tool(
    "get_diagnostics",
    "Get detailed server diagnostics",
    {},
    async () => {
      healthLogger.info('Running diagnostics');
      
      try {
        const diagnostics = {
          server: {
            status: 'running',
            version: process.env.npm_package_version || 'unknown',
            uptime: process.uptime()
          },
          couchbase: {
            connected: !!capellaConn.defaultBucket,
            bucket: capellaConn.defaultBucket ? {
              name: capellaConn.defaultBucket.name,
              scopes: await capellaConn.defaultBucket.collections().getAllScopes()
            } : null
          },
          system: {
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
          }
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify(diagnostics, null, 2)
          }]
        };
      } catch (error) {
        healthLogger.error('Diagnostics failed', { error });
        throw error;
      }
    }
  );

  healthLogger.info('Health checks registered successfully');
} 