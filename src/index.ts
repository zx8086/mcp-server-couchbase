// src/index.ts

import "./set-global"; 
import path from "path";
globalThis.CN_ROOT = globalThis.CN_ROOT || path.resolve(__dirname, "..");

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { createLogger, format, transports } from "winston";
import { getCluster } from "./lib/clusterProvider";
import { config } from 'dotenv';

config();

const MCP_SERVER_NAME = "couchbase";
const TRANSPORT_MODE = process.env.MCP_TRANSPORT || "stdio";
const SERVER_PORT = parseInt(process.env.FASTMCP_PORT || "8080");
const READ_ONLY_QUERY_MODE = process.env.READ_ONLY_QUERY_MODE !== "false";

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.printf(({ level, message, timestamp }) => {
            return `${timestamp} - ${MCP_SERVER_NAME} - ${level}: ${message}`;
        })
    ),
    transports: [new transports.Console()]
});

// Application context class
class AppContext {
    capellaConn: Awaited<ReturnType<typeof getCluster>> | null = null;
    readOnlyQueryMode: boolean = true;
}

// SQL++ Parser interface for validating queries
interface SQLPPParser {
    parse(query: string): any;
    modifiesData(parsedQuery: any): boolean;
    modifiesStructure(parsedQuery: any): boolean;
}

// Basic SQL++ Parser implementation
class SQLPPParserImpl implements SQLPPParser {
    parse(query: string): any {
        // This is a placeholder - in a real implementation, this would parse the SQL++ query
        return { query };
    }

    modifiesData(parsedQuery: any): boolean {
        // This is a placeholder - in a real implementation, this would analyze the query
        const query = parsedQuery.query.toLowerCase();
        return query.includes('insert') ||
            query.includes('update') ||
            query.includes('delete') ||
            query.includes('upsert') ||
            query.includes('merge');
    }

    modifiesStructure(parsedQuery: any): boolean {
        // This is a placeholder - in a real implementation, this would analyze the query
        const query = parsedQuery.query.toLowerCase();
        return query.includes('create') ||
            query.includes('drop') ||
            query.includes('alter');
    }
}

// Initialize SQL++ Parser
const sqlppParser: SQLPPParser = new SQLPPParserImpl();

// Create MCP server with capabilities
const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: "1.0.0",
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

// Helper function to run SQL++ queries
async function runSqlPlusPlusQuery(ctx: any, scopeName: string, query: string): Promise<any[]> {
    const bucket = ctx.lifespanContext.bucket;
    const readOnlyQueryMode = ctx.lifespanContext.readOnlyQueryMode;

    if (!bucket) {
        throw new Error("Bucket is not initialized");
    }

    logger.info(`Running SQL++ queries in read-only mode: ${readOnlyQueryMode}`);

    try {
        const scope = bucket.scope(scopeName);

        // If read-only mode is enabled, check if the query is a data or structure modification query
        if (readOnlyQueryMode) {
            const parsedQuery = sqlppParser.parse(query);

            const dataModificationQuery = sqlppParser.modifiesData(parsedQuery);
            const structureModificationQuery = sqlppParser.modifiesStructure(parsedQuery);

            if (dataModificationQuery) {
                const errorMsg = "Data modification query is not allowed in read-only mode";
                logger.error(errorMsg);
                throw new Error(errorMsg);
            }

            if (structureModificationQuery) {
                const errorMsg = "Structure modification query is not allowed in read-only mode";
                logger.error(errorMsg);
                throw new Error(errorMsg);
            }
        }

        // Run the query
        const result = await scope.query(query);
        const rows: any[] = [];

        for await (const row of result.rows) {
            rows.push(row);
        }

        return rows;
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Error running query: ${errorMsg}`);
        throw error;
    }
}

// Register MCP tools
server.tool(
    "get_scopes_and_collections_in_bucket",
    "Get the names of all scopes and collections in the bucket.",
    {},
    getScopesAndCollectionsHandler
);

server.tool(
    "get_schema_for_collection",
    "Get the schema for a collection in the specified scope.",
    {
        scope_name: z.string().describe("Name of the scope"),
        collection_name: z.string().describe("Name of the collection")
    },
    async (ctx, { scope_name, collection_name }) => {
        try {
            const query = `INFER ${collection_name}`;
            const result = await runSqlPlusPlusQuery(ctx, scope_name, query);

            return {
                content: [
                    {
                        type: "text",
                        text: `Schema for collection "${collection_name}" in scope "${scope_name}":\n${JSON.stringify(result, null, 2)}`
                    }
                ]
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`Error getting schema: ${errorMsg}`);
            throw error;
        }
    }
);

server.tool(
    "get_document_by_id",
    "Get a document by its ID from the specified scope and collection.",
    {
        scope_name: z.string().describe("Name of the scope"),
        collection_name: z.string().describe("Name of the collection"),
        document_id: z.string().describe("ID of the document to retrieve")
    },
    async (ctx, { scope_name, collection_name, document_id }) => {
        const bucket = ctx.lifespanContext.bucket;

        if (!bucket) {
            throw new Error("Bucket is not initialized");
        }

        try {
            const collection = bucket.scope(scope_name).collection(collection_name);
            const result = await collection.get(document_id);

            return {
                content: [
                    {
                        type: "text",
                        text: `Document "${document_id}" from collection "${collection_name}" in scope "${scope_name}":\n${JSON.stringify(result.content, null, 2)}`
                    }
                ]
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`Error getting document ${document_id}: ${errorMsg}`);
            throw error;
        }
    }
);

server.tool(
    "upsert_document_by_id",
    "Insert or update a document by its ID.",
    {
        scope_name: z.string().describe("Name of the scope"),
        collection_name: z.string().describe("Name of the collection"),
        document_id: z.string().describe("ID of the document to upsert"),
        document_content: z.record(z.any()).describe("Content of the document")
    },
    async (ctx, { scope_name, collection_name, document_id, document_content }) => {
        const bucket = ctx.lifespanContext.bucket;

        if (!bucket) {
            throw new Error("Bucket is not initialized");
        }

        try {
            const collection = bucket.scope(scope_name).collection(collection_name);
            await collection.upsert(document_id, document_content);

            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully upserted document "${document_id}" in collection "${collection_name}" in scope "${scope_name}"`
                    }
                ]
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`Error upserting document ${document_id}: ${errorMsg}`);
            throw error;
        }
    }
);

server.tool(
    "delete_document_by_id",
    "Delete a document by its ID.",
    {
        scope_name: z.string().describe("Name of the scope"),
        collection_name: z.string().describe("Name of the collection"),
        document_id: z.string().describe("ID of the document to delete")
    },
    async (ctx, { scope_name, collection_name, document_id }) => {
        const bucket = ctx.lifespanContext.bucket;

        if (!bucket) {
            throw new Error("Bucket is not initialized");
        }

        try {
            const collection = bucket.scope(scope_name).collection(collection_name);
            await collection.remove(document_id);

            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully deleted document "${document_id}" from collection "${collection_name}" in scope "${scope_name}"`
                    }
                ]
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`Error deleting document ${document_id}: ${errorMsg}`);
            throw error;
        }
    }
);

server.tool(
    "run_sql_plus_plus_query",
    "Run a SQL++ query on a scope and return the results.",
    {
        scope_name: z.string().describe("Name of the scope"),
        query: z.string().describe("SQL++ query to execute")
    },
    async (ctx, { scope_name, query }) => {
        try {
            const results = await runSqlPlusPlusQuery(ctx, scope_name, query);

            return {
                content: [
                    {
                        type: "text",
                        text: `Query results from scope "${scope_name}":\n${JSON.stringify(results, null, 2)}`
                    }
                ]
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`Error running query: ${errorMsg}`);
            throw error;
        }
    }
);

// Main function to start the server
async function main() {
    try {
        logger.info("Starting Couchbase MCP Server...");

        // Initialize Couchbase connection using the new structure
        const capellaConn = await getCluster();

        // Create application context once
        const appContext = new AppContext();
        appContext.capellaConn = capellaConn;
        appContext.readOnlyQueryMode = READ_ONLY_QUERY_MODE;

        // Simulate a context object as expected by your tool handler
        const testCtx = {
            lifespanContext: {
                bucket: capellaConn.defaultBucket,
                readOnlyQueryMode: READ_ONLY_QUERY_MODE,
            }
        };

        try {
            const result = await getScopesAndCollectionsHandler(testCtx);
            console.log("Startup test: List of scopes and collections:", result.content[0].text);
        } catch (err) {
            console.error("Startup test failed:", err);
        }

        // Create appropriate transport based on configuration
        let transport;
        if (TRANSPORT_MODE === "sse") {
            transport = new SSEServerTransport({
                port: SERVER_PORT
            });
            logger.info(`Using SSE transport on port ${SERVER_PORT}`);
        } else {
            transport = new StdioServerTransport();
            logger.info("Using stdio transport");
        }

        // Connect to transport
        await server.connect(transport);
        logger.info(`Couchbase MCP Server running with ${TRANSPORT_MODE} transport`);

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Error starting server: ${errorMsg}`);
        process.exit(1);
    }
}

// Start the server
main().catch((error) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Fatal error in main(): ${errorMsg}`);
    process.exit(1);
});

export async function getScopesAndCollectionsHandler(ctx: any) {
    const bucket = ctx.lifespanContext.bucket;

    if (!bucket) {
        throw new Error("Bucket is not initialized");
    }

    try {
        const scopesCollections: Record<string, string[]> = {};
        const collectionManager = bucket.collections();
        const scopes = await collectionManager.getAllScopes();

        for (const scope of scopes) {
            const collectionNames = scope.collections.map(c => c.name);
            scopesCollections[scope.name] = collectionNames;
        }

        return {
            content: [
                {
                    type: "text",
                    text: `Available scopes and collections in bucket:\n${JSON.stringify(scopesCollections, null, 2)}`
                }
            ]
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Error getting scopes and collections: ${errorMsg}`);
    }
}