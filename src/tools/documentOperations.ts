/* src/tools/documentOperations.ts */


import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, createContextLogger } from "../lib/logger";
import type { Bucket } from "couchbase";
import { formatDocumentResponse } from "./toolUtils";
import { handleOperation } from "../lib/errorUtils";
import { createError } from "../lib/errors";
import { z } from "zod";

const docLogger = createContextLogger('DocumentOps');

const schema = {
    scope_name: z.string(),
    collection_name: z.string(),
    document_id: z.string()
};

export default (server: McpServer, bucket: Bucket) => {
    // Get document
    server.tool(
        "get_document_by_id",
        {
            scope_name: "string",
            collection_name: "string",
            document_id: "string"
        },
        async (params) => {
            try {
                const { scope_name, collection_name, document_id } = params;

                if (!bucket) {
                    throw new Error("Bucket is not initialized");
                }

                const collection = bucket.scope(scope_name).collection(collection_name);
                const result = await collection.get(document_id);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(result.content, null, 2)
                    }]
                };
            } catch (error) {
                console.error("Error in get_document_by_id:", error);
                throw error;
            }
        }
    );

    // Upsert document
    server.tool(
        "upsert_document_by_id",
        {
            ...schema,
            document_content: z.string()
        },
        async ({ scope_name, collection_name, document_id, document_content }) => {
            if (!bucket) throw createError('DB_ERROR', "Bucket is not initialized");
            const parsedContent = JSON.parse(document_content);
            if (typeof parsedContent !== 'object' || Array.isArray(parsedContent) || Object.keys(parsedContent).length === 0) {
                throw createError('VALIDATION_ERROR', "document_content must be a non-empty JSON object");
            }
            const collection = bucket.scope(scope_name).collection(collection_name);
            await collection.upsert(document_id, parsedContent);
            return formatDocumentResponse('Upsert', scope_name, collection_name, document_id, parsedContent);
        }
    );

    // Delete document
    server.tool(
        "delete_document_by_id",
        schema,
        async ({ scope_name, collection_name, document_id }) => {
            if (!bucket) throw createError('DB_ERROR', "Bucket is not initialized");
            const collection = bucket.scope(scope_name).collection(collection_name);
            await collection.remove(document_id);
            return formatDocumentResponse('Delete', scope_name, collection_name, document_id);
        }
    );
};