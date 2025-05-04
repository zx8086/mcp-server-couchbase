// src/index.ts

import "./set-global";
import path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/server/sse.js";
import { getCluster } from "./lib/clusterProvider";
import type { capellaConn } from "./types";
import tools from "./tools";
import { AppError } from "./lib/errors";
import { config } from "./config";
import { logger } from "./lib/logger";

// Add global type declaration for capellaConn
declare global {
    // eslint-disable-next-line no-var
    var capellaConn: capellaConn | null;
}

// Application context setup
class AppContext {
    constructor(
        public capellaConn: capellaConn | null = null,
        public readOnlyQueryMode: boolean = config.server.readOnlyQueryMode
    ) {}
}

async function createServer(capellaConn: capellaConn): Promise<McpServer> {
    const server = new McpServer({
        name: config.server.name,
        version: config.server.version,
        capabilities: {
            resources: {},
            tools: {
                systemPrompt: `I am a Couchbase server interface that helps you interact with Couchbase databases.
                I can help you:
                1. Get information about scopes and collections
                2. Retrieve documents by ID from specific scopes and collections
                3. Insert or update documents in scopes and collections
                4. Delete documents by ID
                5. Run SQL++ queries on a scope
                
                When using me, please provide specific details about the scope, collection, and operations you want to perform.`,
                examples: [
                    {
                        input: "Show me all scopes and collections in my bucket",
                        output: {
                            type: "tool_call",
                            name: "get_scopes_and_collections_in_bucket",
                            parameters: {}
                        }
                    },
                    {
                        input: "Get document with ID 'user_123' from the 'users' collection in 'main' scope",
                        output: {
                            type: "tool_call",
                            name: "get_document_by_id",
                            parameters: {
                                scope_name: "main",
                                collection_name: "users",
                                document_id: "user_123"
                            }
                        }
                    }
                ]
            }
        }
    });
    registerTools(server, capellaConn.defaultBucket);
    return server;
}

function registerTools(server: McpServer, bucket: any): void {
    tools.forEach((tool, idx) => {
        const toolName = tool.name || `Tool #${idx + 1}`;
        logger.info(`Registering tool: ${toolName}`);
        tool(server, bucket);
    });
}

async function main(): Promise<void> {
    try {
        logger.info("Starting Couchbase MCP Server...");
        const capellaConn = await getCluster();
        const server = await createServer(capellaConn);

        let transport: Transport;
        if (config.server.transportMode === "sse") {
            transport = new SSEServerTransport(config.server.port, "/sse");
            logger.info(`Using SSE transport on port ${config.server.port}`);
        } else {
            transport = new StdioServerTransport();
            logger.info("Using stdio transport");
        }

        await server.connect(transport);
        logger.info(`Couchbase MCP Server running with ${config.server.transportMode} transport`);
    } catch (error) {
        if (error instanceof AppError) {
            logger.error(`Error starting server: ${error.message} (${error.code})`);
        } else {
            logger.error(`Error starting server: ${error instanceof Error ? error.message : String(error)}`);
        }
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