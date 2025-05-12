/* src/tools/getDocumentById.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, createContextLogger } from "../lib/logger";
import type { Bucket } from "couchbase";
import { createError } from "../lib/errors";

const docLogger = createContextLogger('DocumentOps');

export default (server: McpServer, bucket: Bucket) => {
    server.tool(
        "get_document_by_id",
        "Get a document by ID from a specific scope and collection",
        {
            type: "object",
            properties: {
                scope_name: { type: "string", description: "Name of the scope" },
                collection_name: { type: "string", description: "Name of the collection" },
                document_id: { type: "string", description: "ID of the document to retrieve" }
            },
            required: ["scope_name", "collection_name", "document_id"],
            additionalProperties: false,
            $schema: "http://json-schema.org/draft-07/schema#"
        },
        async (params) => {
            const { scope_name, collection_name, document_id } = params;
            docLogger.info("Handler received:", { scope_name, collection_name, document_id });
            try {
                if (!bucket) {
                    throw createError('DB_ERROR', "Bucket is not initialized");
                }
                const collection = bucket.scope(scope_name).collection(collection_name);
                const result = await collection.get(document_id);
                docLogger.info("get_document_by_id result", { result: result.content });
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(result.content, null, 2)
                    }]
                };
            } catch (error) {
                docLogger.error("Error in get_document_by_id:", error);
                throw error;
            }
        }
    );
}; 