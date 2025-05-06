/* src/index.ts */

// Import global setup first
import './set-global';

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { capellaConn, AppContext } from "./types";
import { AppError } from "./lib/errors";
import { config } from "./config";
import { logger } from "./lib/logger";
import { CouchbaseConnectionManager } from "./lib/connectionManager";
import { ToolRegistry } from "./lib/toolRegistry";
import { registerResourceMethods } from "./lib/resources";

// Application context setup
const appContext: AppContext = {
    readOnlyQueryMode: config.server.readOnlyQueryMode
};

export async function createServer(capellaConn: capellaConn): Promise<McpServer> {
    const server = new McpServer({
        name: config.server.name,
        version: config.server.version,
        capabilities: {
            resources: {
                list: true
            },
            tools: {
                systemPrompt: `I am a Couchbase server interface that helps you interact with Couchbase databases.
                I can help you:
                1. Get information about scopes and collections
                2. Retrieve documents by ID from specific scopes and collections
                3. Insert or update documents in specific scopes and collections
                4. Delete documents by ID from specific scopes and collections
                5. Run SQL++ queries on a scope
                
                When using me, please provide specific details about the scope, collection, and operations you want to perform.
                
                Important: When making tool calls, always include both the tool name and arguments in a single request. For example:
                {
                    "method": "tools/call",
                    "params": {
                        "name": "tool_name",
                        "arguments": {
                            "param1": "value1",
                            "param2": "value2"
                        }
                    }
                }`,
                examples: [
                    {
                        input: "Show me all scopes and collections in my bucket",
                        output: {
                            type: "tool_call",
                            name: "get_scopes_and_collections_in_bucket",
                            arguments: {}
                        }
                    },
                    {
                        input: "Get document with ID 'user_123' from the 'users' collection in 'main' scope",
                        output: {
                            type: "tool_call",
                            name: "get_document_by_id",
                            arguments: {
                                scope_name: "main",
                                collection_name: "users",
                                document_id: "user_123"
                            }
                        }
                    },
                    {
                        input: "Create a quote document in the default scope and collection",
                        output: {
                            type: "tool_call",
                            name: "upsert_document_by_id",
                            arguments: {
                                scope_name: "_default",
                                collection_name: "_default",
                                document_id: "capella_quote_doc",
                                document_content: {
                                    text: "Couchbase Capella MCP Server",
                                    quote: "You can't trust quotes from the internet",
                                    author: "Abraham Lincoln",
                                    at: "2025-05-06T12:34:56.789Z"
                                }
                            }
                        }
                    }
                ]
            }
        }
    });
    
    ToolRegistry.registerAll(server, capellaConn.defaultBucket);
    registerResourceMethods(server);
    return server;
}

export async function createTransport(deps: { transport: 'stdio' | 'sse', port?: number }): Promise<Transport> {
    if (deps.transport === 'sse') {
        return new SSEServerTransport(deps.port || 8080, "/sse");
    }
    return new StdioServerTransport();
}

function handleServerStartupError(error: unknown): never {
    if (error instanceof AppError) {
        logger.error(`Error starting server: ${error.message} (${error.code})`);
        throw error;
    } else {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(`Error starting server: ${err.message}`);
        throw err;
    }
}

// Export startServer for testing
export async function startServer(deps: { transport: 'stdio' | 'sse', port?: number }): Promise<void> {
    try {
        logger.info("Starting Couchbase MCP Server...");
        const capellaConn = await CouchbaseConnectionManager.getConnection();
        const server = await createServer(capellaConn);
        const transport = await createTransport(deps);
        
        await server.connect(transport);
        logger.info(`Couchbase MCP Server running with ${deps.transport} transport`);
    } catch (error) {
        handleServerStartupError(error);
    }
}

/**
 * Create and configure the server instance
 */
export async function setupServer(): Promise<{
  server: McpServer;
  transport: Transport;
  capellaConn: capellaConn;
}> {
  // Get connection
  const capellaConn = await CouchbaseConnectionManager.getConnection();
  
  // Create server instance
  const server = await createServer(capellaConn);
  
  // Create transport
  const transport = await createTransport({
    transport: config.server.transportMode as 'stdio' | 'sse',
    port: config.server.port
  });
  
  return { server, transport, capellaConn };
}

// Main function
async function main(): Promise<void> {
  try {
    logger.info("Starting Couchbase MCP Server...");
    
    const { server, transport } = await setupServer();
    
    // Connect and start the server
    await server.connect(transport);
    logger.info(`Couchbase MCP Server running with ${config.server.transportMode} transport`);
  } catch (error) {
    logger.error(`Fatal error in main(): ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main().catch((error) => {
    logger.error(`Fatal error in main(): ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}