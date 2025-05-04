import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger";
import type { Bucket } from "couchbase";

export const getDocumentByIdHandler = async (params: any, bucket: Bucket) => {
    const { scope_name, collection_name, document_id } = params;
    logger.info(`getDocumentHandler called with scope_name=${scope_name}, collection_name=${collection_name}, document_id=${document_id}`);
    if (!scope_name || !collection_name || !document_id) {
        throw new Error(`Missing required parameters: scope_name=${scope_name}, collection_name=${collection_name}, document_id=${document_id}`);
    }
    if (!bucket) throw new Error("Bucket is not initialized");
    try {
        const collection = bucket.scope(scope_name).collection(collection_name);
        const result = await collection.get(document_id);
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Document "${document_id}" from collection "${collection_name}" in scope "${scope_name}":\n${JSON.stringify(result.content, null, 2)}`
                }
            ]
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Error getting document ${document_id}: ${errorMsg}`);
    }
};

export const upsertDocumentByIdHandler = async (params: any, bucket: Bucket) => {
    const { scope_name, collection_name, document_id, document_content } = params || {};
    if (!scope_name || !collection_name || !document_id || !document_content) {
        throw new Error("Missing required parameters: scope_name, collection_name, document_id, or document_content");
    }
    if (!bucket) throw new Error("Bucket is not initialized");
    try {
        const collection = bucket.scope(scope_name).collection(collection_name);
        await collection.upsert(document_id, document_content);
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Successfully upserted document "${document_id}" in collection "${collection_name}" in scope "${scope_name}"`
                }
            ]
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Error upserting document ${document_id}: ${errorMsg}`);
    }
};

export const deleteDocumentByIdHandler = async (params: any, bucket: Bucket) => {
    const { scope_name, collection_name, document_id } = params || {};
    if (!scope_name || !collection_name || !document_id) {
        throw new Error("Missing required parameters: scope_name, collection_name, or document_id");
    }
    if (!bucket) throw new Error("Bucket is not initialized");
    try {
        const collection = bucket.scope(scope_name).collection(collection_name);
        await collection.remove(document_id);
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Successfully deleted document "${document_id}" from collection "${collection_name}" in scope "${scope_name}"`
                }
            ]
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Error deleting document ${document_id}: ${errorMsg}`);
    }
};

export default (server: McpServer, bucket: Bucket) => {
    server.tool(
        "get_document_by_id",
        "Get a document by its ID from the specified scope and collection.",
        {
            scope_name: z.string().describe("Name of the scope"),
            collection_name: z.string().describe("Name of the collection"),
            document_id: z.string().describe("ID of the document to retrieve")
        },
        async (params: any) => getDocumentByIdHandler(params, bucket)
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
        async (params: any) => upsertDocumentByIdHandler(params, bucket)
    );

    server.tool(
        "delete_document_by_id",
        "Delete a document by its ID.",
        {
            scope_name: z.string().describe("Name of the scope"),
            collection_name: z.string().describe("Name of the collection"),
            document_id: z.string().describe("ID of the document to delete")
        },
        async (params: any) => deleteDocumentByIdHandler(params, bucket)
    );
};