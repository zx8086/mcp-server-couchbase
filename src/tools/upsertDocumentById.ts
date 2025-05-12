/* src/tools/upsertDocumentById.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, createContextLogger } from "../lib/logger";
import type { Bucket } from "couchbase";
import { formatDocumentResponse } from "./toolUtils";
import { createError } from "../lib/errors";
import { z } from "zod";

const docLogger = createContextLogger('DocumentOps');

export default (server: McpServer, bucket: Bucket) => {
    server.tool(
        "upsert_document_by_id",
        "Create or update a document with a specific ID",
        {
            scope_name: z.string().describe("Name of the scope"),
            collection_name: z.string().describe("Name of the collection"),
            document_id: z.string().describe("ID of the document to create or update"),
            document_content: z.string().describe("JSON content of the document")
        },
        async ({ scope_name, collection_name, document_id, document_content }) => {
            try {
                docLogger.info(`Upserting document`, { scope_name, collection_name, document_id });

                if (!bucket) {
                    throw createError('DB_ERROR', "Bucket is not initialized");
                }

                let parsedContent;
                try {
                    parsedContent = JSON.parse(document_content);
                } catch (e) {
                    throw createError('VALIDATION_ERROR', "document_content must be valid JSON");
                }

                if (typeof parsedContent !== 'object' || Array.isArray(parsedContent) || Object.keys(parsedContent).length === 0) {
                    throw createError('VALIDATION_ERROR', "document_content must be a non-empty JSON object");
                }

                const collection = bucket.scope(scope_name).collection(collection_name);
                await collection.upsert(document_id, parsedContent);

                return formatDocumentResponse('Upsert', scope_name, collection_name, document_id, parsedContent);
            } catch (error) {
                docLogger.error("Error in upsert_document_by_id:", error);
                throw error;
            }
        }
    );
}; 