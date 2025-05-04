// src/index.ts

import "./set-global"; 
import path from "path";
globalThis.CN_ROOT = globalThis.CN_ROOT || path.resolve(__dirname, "..");

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { createLogger, format, transports } from "winston";
import { getCluster } from "./lib/clusterProvider";
import type { capellaConn, SQLPPParser, ASTNode } from "./types";
import { createServer } from "http";
import { IncomingMessage, ServerResponse } from "http";

const MCP_SERVER_NAME = Bun.env.MCP_SERVER_NAME || "couchbase-mcp-server";
const TRANSPORT_MODE = Bun.env.MCP_TRANSPORT;
const SERVER_PORT = parseInt(Bun.env.FASTMCP_PORT || "8080");
const READ_ONLY_QUERY_MODE = Bun.env.READ_ONLY_QUERY_MODE !== "false";

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.printf(({ level, message, timestamp }) => {
            return `${timestamp} - ${MCP_SERVER_NAME} - ${level}: ${message}`;
        })
    ),
    transports: [new transports.Console({ stderrLevels: ['info', 'warn', 'error', 'debug', 'verbose', 'silly'] })]
});

// Application context class
class AppContext {
    capellaConn: Awaited<ReturnType<typeof getCluster>> | null = null;
    readOnlyQueryMode: boolean = true;
}

// Robust SQL++ Parser implementation
class SQLPPParserImpl implements SQLPPParser {
    private readonly dataModificationKeywords = new Set([
        'INSERT', 'UPDATE', 'DELETE', 'UPSERT', 'MERGE'
    ]);

    private readonly structureModificationKeywords = new Set([
        'CREATE', 'DROP', 'ALTER', 'GRANT', 'REVOKE'
    ]);

    parse(query: string): ASTNode {
        // Remove comments first
        const cleanedQuery = this.removeComments(query);
        
        // Split into tokens while preserving string literals
        const tokens = this.tokenize(cleanedQuery);
        
        // Build AST
        return this.buildAST(tokens);
    }

    private removeComments(query: string): string {
        // Remove single line comments
        let cleaned = query.replace(/--.*$/gm, '');
        // Remove multi-line comments
        cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
        return cleaned.trim();
    }

    private tokenize(query: string): string[] {
        const tokens: string[] = [];
        let currentToken = '';
        let inString = false;
        let stringDelimiter = '';

        for (let i = 0; i < query.length; i++) {
            const char = query[i] as string;
            
            if (inString) {
                currentToken += char;
                if (char === stringDelimiter && query[i-1] !== '\\') {
                    inString = false;
                    tokens.push(currentToken);
                    currentToken = '';
                }
            } else {
                if (char === '"' || char === "'") {
                    inString = true;
                    stringDelimiter = char;
                    currentToken += char;
                } else if (/\s/.test(char)) {
                    if (currentToken) {
                        tokens.push(currentToken);
                        currentToken = '';
                    }
                } else {
                    currentToken += char;
                }
            }
        }

        if (currentToken) {
            tokens.push(currentToken);
        }

        return tokens;
    }

    private buildAST(tokens: string[]): ASTNode {
        const root: ASTNode = { type: 'ROOT', children: [] };
        let currentNode = root;
        let currentStatement: ASTNode | null = null;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i]?.toUpperCase() ?? '';
            
            if (this.isStatementStart(token)) {
                if (currentStatement) {
                    if (currentNode.children) {
                        currentNode.children.push(currentStatement);
                    }
                }
                currentStatement = { type: token, children: [] };
            } else if (currentStatement) {
                if (currentStatement.children) {
                    currentStatement.children.push({ type: 'TOKEN', value: tokens[i] });
                }
            }
        }

        if (currentStatement && currentNode.children) {
            currentNode.children.push(currentStatement);
        }

        return root;
    }

    private isStatementStart(token: string): boolean {
        return this.dataModificationKeywords.has(token) || 
               this.structureModificationKeywords.has(token) ||
               token === 'SELECT';
    }

    modifiesData(parsedQuery: ASTNode): boolean {
        if (!parsedQuery.children) return false;
        
        return parsedQuery.children.some(child => 
            this.dataModificationKeywords.has(child.type)
        );
    }

    modifiesStructure(parsedQuery: ASTNode): boolean {
        if (!parsedQuery.children) return false;
        
        return parsedQuery.children.some(child => 
            this.structureModificationKeywords.has(child.type)
        );
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
        const result = await scope.query(
            "SELECT META().id, * FROM `_default` LIMIT 1"
        );
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

// --- Tool Handlers as Named Functions ---

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
            const collectionNames = scope.collections.map((c: Collection) => c.name);
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

export async function getSchemaForCollectionHandler(ctx: any, params: any) {
    const { scope_name, collection_name } = params || {};
    if (!scope_name || !collection_name) {
        throw new Error("Missing required parameters: scope_name or collection_name");
    }
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
        throw new Error(`Error getting schema: ${errorMsg}`);
    }
}

export async function getDocumentByIdHandler(ctx: any, params: any = {}) {
    const { scope_name, collection_name, document_id } = params;
    logger.info(`getDocumentByIdHandler called with scope_name=${scope_name}, collection_name=${collection_name}, document_id=${document_id}`);
    if (!scope_name || !collection_name || !document_id) {
        throw new Error(`Missing required parameters: scope_name=${scope_name}, collection_name=${collection_name}, document_id=${document_id}`);
    }
    const bucket = ctx.lifespanContext.bucket;
    if (!bucket) throw new Error("Bucket is not initialized");
    try {
        const collection = bucket.scope(scope_name).collection(collection_name);
        const result = await collection.get(document_id);
        console.error("getDocumentByIdHandler ctx:", ctx);
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
        throw new Error(`Error getting document ${document_id}: ${errorMsg}`);
    }
}

export async function upsertDocumentByIdHandler(ctx: any, params: any) {
    const { scope_name, collection_name, document_id, document_content } = params || {};
    if (!scope_name || !collection_name || !document_id || !document_content) {
        throw new Error("Missing required parameters: scope_name, collection_name, document_id, or document_content");
    }
    const bucket = ctx.lifespanContext.bucket;
    if (!bucket) throw new Error("Bucket is not initialized");
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
        throw new Error(`Error upserting document ${document_id}: ${errorMsg}`);
    }
}

export async function deleteDocumentByIdHandler(ctx: any, params: any) {
    const { scope_name, collection_name, document_id } = params || {};
    if (!scope_name || !collection_name || !document_id) {
        throw new Error("Missing required parameters: scope_name, collection_name, or document_id");
    }
    const bucket = ctx.lifespanContext.bucket;
    if (!bucket) throw new Error("Bucket is not initialized");
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
        throw new Error(`Error deleting document ${document_id}: ${errorMsg}`);
    }
}

export async function runSqlPlusPlusQueryHandler(ctx: any, params: any) {
    const { scope_name, query } = params || {};
    if (!scope_name || !query) {
        throw new Error("Missing required parameters: scope_name or query");
    }
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
        throw new Error(`Error running query: ${errorMsg}`);
    }
}

// --- Register tools using the named handlers ---

server.tool(
    "get_scopes_and_collections_in_bucket",
    "Get the names of all scopes and collections in the bucket.",
    {},
    async () => {
        if (!globalThis.capellaConn) {
            globalThis.capellaConn = await getCluster();
        }
        if (!globalThis.capellaConn) {
            throw new Error("Failed to establish Couchbase connection");
        }
        const bucket = globalThis.capellaConn.defaultBucket;
        const scopesCollections: Record<string, string[]> = {};
        const collectionManager = bucket.collections();
        const scopes = await collectionManager.getAllScopes();
        for (const scope of scopes) {
            const collectionNames = scope.collections.map((c: Collection) => c.name);
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
    }
);

server.tool(
    "get_schema_for_collection",
    "Get the schema for a collection in the specified scope.",
    {
        scope_name: z.string().describe("Name of the scope"),
        collection_name: z.string().describe("Name of the collection")
    },
    async ({ scope_name, collection_name }) => {
        if (!globalThis.capellaConn) {
            globalThis.capellaConn = await getCluster();
        }
        if (!globalThis.capellaConn) {
            throw new Error("Failed to establish Couchbase connection");
        }
        const bucket = globalThis.capellaConn.defaultBucket;
        const query = `INFER ${collection_name}`;
        const scope = bucket.scope(scope_name);
        const result = await scope.query(query);
        const rows: any[] = [];
        for await (const row of result.rows) {
            rows.push(row);
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Schema for collection "${collection_name}" in scope "${scope_name}":\n${JSON.stringify(rows, null, 2)}`
                }
            ]
        };
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
    async ({ scope_name, collection_name, document_id }) => {
        if (!globalThis.capellaConn) {
            globalThis.capellaConn = await getCluster();
        }
        if (!globalThis.capellaConn) {
            throw new Error("Failed to establish Couchbase connection");
        }
        const bucket = globalThis.capellaConn.defaultBucket;
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
    async ({ scope_name, collection_name, document_id, document_content }) => {
        if (!globalThis.capellaConn) {
            globalThis.capellaConn = await getCluster();
        }
        if (!globalThis.capellaConn) {
            throw new Error("Failed to establish Couchbase connection");
        }
        const bucket = globalThis.capellaConn.defaultBucket;
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
    async ({ scope_name, collection_name, document_id }) => {
        if (!globalThis.capellaConn) {
            globalThis.capellaConn = await getCluster();
        }
        if (!globalThis.capellaConn) {
            throw new Error("Failed to establish Couchbase connection");
        }
        const bucket = globalThis.capellaConn.defaultBucket;
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
    }
);

server.tool(
    "run_sql_plus_plus_query",
    "Run a SQL++ query on a scope and return the results.",
    {
        scope_name: z.string().describe("Name of the scope"),
        query: z.string().describe("SQL++ query to execute")
    },
    async ({ scope_name, query }) => {
        if (!globalThis.capellaConn) {
            globalThis.capellaConn = await getCluster();
        }
        if (!globalThis.capellaConn) {
            throw new Error("Failed to establish Couchbase connection");
        }
        const bucket = globalThis.capellaConn.defaultBucket;
        const scope = bucket.scope(scope_name);
        const result = await scope.query(query);
        const rows: any[] = [];
        for await (const row of result.rows) {
            rows.push(row);
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Query results from scope "${scope_name}":\n${JSON.stringify(rows, null, 2)}`
                }
            ]
        };
    }
);

// Main function to start the server
async function main() {
    try {
        logger.info("Starting Couchbase MCP Server...");

        // Initialize Couchbase connection using the new structure
        const capellaConn = await getCluster();

        // Make the connection available globally
        globalThis.capellaConn = capellaConn;

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

        // --- Startup tests for each tool ---
        // try {
        //     // 1. List all scopes and collections
        //     const scopesResult = await getScopesAndCollectionsHandler(testCtx);
        //     console.log("Startup test: List of scopes and collections:", scopesResult.content[0].text);
        //     await sleep(15000);

        //     // // 2. Get schema for _default._default
        //     // const schemaResult = await getSchemaForCollectionHandler(testCtx, {
        //     //     scope_name: "_default",
        //     //     collection_name: "_default"
        //     // });
        //     // console.log("Startup test: Schema for _default._default:", schemaResult.content[0].text);
        //     // await sleep(15000);

            // 3. Upsert a test document
            // let upsertSuccess = false;
            // try {
            //     const upsertResult = await upsertDocumentByIdHandler(testCtx, {
            //         scope_name: "_default",
            //         collection_name: "_default",
            //         document_id: "startup_test_doc",
            //         document_content: { text: "Couchbase Capella MCP Server", at: new Date().toISOString() }
            //     });
            //     console.log("Startup test: Upsert document:", upsertResult.content[0].text);
            //     upsertSuccess = true;
            // } catch (err) {
            //     console.error("Startup test: Upsert failed:", err);
            // }
            // await sleep(15000);

        //     // 4. Get the test document (only if upsert succeeded)
        //     if (upsertSuccess) {
        //         try {
        //             const getDocResult = await getDocumentByIdHandler(testCtx, {
        //                 scope_name: "_default",
        //                 collection_name: "_default",
        //                 document_id: "startup_test_doc"
        //             });
        //             console.log("Startup test: Get document:", getDocResult.content[0].text);
        //         } catch (err) {
        //             console.error("Startup test: Get document failed:", err);
        //         }
        //         await sleep(15000);
        //     }

        //     // 5. Run a simple SQL++ query
        //     const sqlResult = await runSqlPlusPlusQueryHandler(testCtx, {
        //         scope_name: "_default",
        //         query: "SELECT META().id, * FROM `_default` LIMIT 1"
        //     });
        //     console.log("Startup test: SQL++ query result:", sqlResult.content[0].text);
        //     await sleep(15000);

        //     // 6. Delete the test document
        //     const deleteResult = await deleteDocumentByIdHandler(testCtx, {
        //         scope_name: "_default",
        //         collection_name: "_default",
        //         document_id: "startup_test_doc"
        //     });
        //     console.log("Startup test: Delete document:", deleteResult.content[0].text);

        // } catch (err) {
        //     console.error("Startup test failed:", err);
        // }

        // Create appropriate transport based on configuration
        let transport: Transport;
        if (TRANSPORT_MODE === "sse") {
            transport = new SSEServerTransport(SERVER_PORT, "/sse");
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

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

interface Collection {
    name: string;
}

interface Scope {
    name: string;
    collections: Collection[];
}

declare global {
    var capellaConn: capellaConn | null;
}