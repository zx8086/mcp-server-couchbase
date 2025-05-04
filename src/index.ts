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
import { createServer as createHttpServer } from "http";
import { IncomingMessage, ServerResponse } from "http";
import * as scopesAndCollectionsTool from './tools/getScopesAndCollections';
import * as schemaTool from './tools/getSchemaForCollection';
import * as documentOperationsTool from './tools/documentOperations';
import * as sqlPlusPlusTool from './tools/runSqlPlusPlusQuery';
import tools from "./tools";
import type { AppContext, ServerSettings } from "./types";
import { AppError, DatabaseError } from "./lib/errors";
import { config } from "./config";
import { logger } from "./lib/logger";

const MCP_SERVER_NAME = Bun.env.MCP_SERVER_NAME || "couchbase-mcp-server";
const TRANSPORT_MODE = Bun.env.MCP_TRANSPORT;
const SERVER_PORT = parseInt(Bun.env.FASTMCP_PORT || "8080");
const READ_ONLY_QUERY_MODE = Bun.env.READ_ONLY_QUERY_MODE !== "false";

// Application context class
class AppContextImpl implements AppContext {
    capellaConn: Awaited<ReturnType<typeof getCluster>> | null = null;
    readOnlyQueryMode: boolean = config.server.readOnlyQueryMode;
    cluster: Awaited<ReturnType<typeof getCluster>> | null = null;
    bucket: Awaited<ReturnType<typeof getCluster>>['defaultBucket'] | null = null;
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

function registerTools(server: McpServer) {
    scopesAndCollectionsTool.register(server);
    schemaTool.register(server);
    documentOperationsTool.register(server);
    sqlPlusPlusTool.register(server);
}

async function createServer(capellaConn: Awaited<ReturnType<typeof getCluster>>) {
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

    // Register all tools
    tools.forEach(tool => tool(server));

    return server;
}

// Main function to start the server
async function main() {
    try {
        logger.info("Starting Couchbase MCP Server...");

        // Initialize database connection
        const capellaConn = await getCluster();

        // Create and configure server with the connection
        const server = await createServer(capellaConn);

        // Configure transport
        let transport: Transport;
        if (config.server.transportMode === "sse") {
            transport = new SSEServerTransport(config.server.port, "/sse");
            logger.info(`Using SSE transport on port ${config.server.port}`);
        } else {
            transport = new StdioServerTransport();
            logger.info("Using stdio transport");
        }

        // Connect to transport
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

// Start the server
main().catch((error) => {
    logger.error(`Fatal error in main(): ${error instanceof Error ? error.message : String(error)}`);
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