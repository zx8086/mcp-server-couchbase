/* src/index.ts */

// Import global setup first
import './set-global';

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { CapellaConn, AppContext } from "./types";
import { AppError } from "./lib/errors";
import { config } from "./config";
import { logger } from "./lib/logger";
import { connectionManager } from "./lib/connectionManager";
import { ToolRegistry } from "./lib/toolRegistry";
import { registerResourceMethods } from "./lib/resources";
import { registerResources } from "./lib/resourceHandlers";
import { registerSqlppQueryGenerator } from "./prompts/sqlppQueryGenerator";
import { registerDatabaseStructureResource } from "./resources/databaseStructureResource";
import { registerAllResources } from "./resources";
import { registerPingHandlers } from "./lib/pingHandler";

// Application context setup
const appContext: AppContext = {
    readOnlyQueryMode: config.server.readOnlyQueryMode
};

export async function createServer(bucket: any): Promise<McpServer> {
    const server = new McpServer({
        name: config.server.name,
        version: config.server.version,
        capabilities: { 
            tools: {}, 
            resources: {},
            prompts: {}
        }
    });

    // Register all tools
    ToolRegistry.registerAll(server, bucket);
    
    // Register our SQL++ query generator prompt
    registerSqlppQueryGenerator(server);
    
    // Register all Couchbase resources
    registerAllResources(server, bucket);

    // Register ping handlers for both protocol and tool usage
    registerPingHandlers(server, bucket);

    // Register a minimal echo tool for debugging
    function getDocLogger() {
        const { createContextLogger } = require("./lib/logger");
        return createContextLogger('EchoTool');
    }
    server.tool(
        "echo",
        {},
        async (params: any) => {
            getDocLogger().info("EchoTool RAW params", { raw_params: JSON.stringify(params) });
            return { content: [{ type: "text", text: JSON.stringify(params) }] };
        }
    );

    return server;
}

export async function createTransport(deps: { transport: 'stdio' | 'sse', port?: number }): Promise<Transport> {
    if (deps.transport === 'sse') {
        return new SSEServerTransport(deps.port || 8080, "/sse");
    }
    return new StdioServerTransport();
}

function handleServerStartupError(error: unknown): never {
    logger.error(`Error starting server: ${error instanceof Error ? error.message : String(error)}`);
    throw error instanceof Error ? error : new Error(String(error));
}

export async function startServer(deps: { transport: 'stdio' | 'sse', port?: number }): Promise<void> {
    try {
        logger.info("Starting Couchbase MCP Server...");
        const bucket = await connectionManager.getConnection();
        const server = await createServer(bucket);
        const transport = await createTransport(deps);
        await server.connect(transport);
        logger.info(`Couchbase MCP Server running with ${deps.transport} transport`);
    } catch (error) {
        handleServerStartupError(error);
    }
}

export async function setupServer(): Promise<{
  server: McpServer;
  transport: Transport;
  bucket: any;
}> {
  const bucket = await connectionManager.getConnection();
  const server = await createServer(bucket);
  const transport = await createTransport({
    transport: 'stdio',
    port: 8080
  });
  return { server, transport, bucket };
}

async function main(): Promise<void> {
  try {
    logger.info("Starting Couchbase MCP Server...");
    
    // Initialize the connection manager
    await connectionManager.initialize();
    
    const { server, transport } = await setupServer();
    await server.connect(transport);
    logger.info(`Couchbase MCP Server running with stdio transport`);
  } catch (error) {
    logger.error(`Fatal error in main(): ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', { reason: reason instanceof Error ? reason.message : String(reason) });
  process.exit(1);
});

// Start the server
main().catch((error) => {
  logger.error(`Fatal error in main(): ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}