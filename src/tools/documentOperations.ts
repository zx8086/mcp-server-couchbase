/* src/tools/documentOperations.ts */
//
// STRICT PARAMETER NAMES ENFORCED:
//   scope_name, collection_name, document_id, document_content (for upsert)
//
// Clients MUST use these exact parameter names when calling tools.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, createContextLogger } from "../lib/logger";
import type { Bucket } from "couchbase";
import { formatDocumentResponse } from "./toolUtils";
import { handleOperation } from "../lib/errorUtils";
import { createError } from "../lib/errors";
import { z } from "zod";

const docLogger = createContextLogger('DocumentOps');

const formatDocument = (doc: any): string => {
    return JSON.stringify(doc, null, 2);
};

export default (server: McpServer, bucket: Bucket) => {
    server.tool(
        "get_document_by_id",
        {
            scope_name: z.string().describe("Name of the scope. Required. Use 'scope_name', not 'scope'."),
            collection_name: z.string().describe("Name of the collection. Required. Use 'collection_name', not 'collection'."),
            document_id: z.string().describe("ID of the document to retrieve. Required. Use 'document_id', not 'id'.")
        },
        async ({ scope_name, collection_name, document_id }) => {
            docLogger.info("getDocumentById received", { scope_name, collection_name, document_id });
            if (!scope_name) throw createError('VALIDATION_ERROR', "Missing required parameter: scope_name");
            if (!collection_name) throw createError('VALIDATION_ERROR', "Missing required parameter: collection_name");
            if (!document_id) throw createError('VALIDATION_ERROR', "Missing required parameter: document_id");
            return handleOperation(
                async () => {
                    if (!bucket) {
                        docLogger.error('Bucket not initialized');
                        throw createError('DB_ERROR', "Bucket is not initialized");
                    }
                    docLogger.info('Accessing collection', {
                        bucket: bucket.name,
                        scope: scope_name,
                        collection: collection_name,
                        documentId: document_id
                    });
                    const collection = bucket.scope(scope_name).collection(collection_name);
                    const result = await collection.get(document_id);
                    docLogger.info('Document retrieved successfully', {
                        scope: scope_name,
                        collection: collection_name,
                        documentId: document_id
                    });
                    return formatDocumentResponse('Get', scope_name, collection_name, document_id, result.content);
                },
                'DB_ERROR',
                'retrieving document',
                { scope: scope_name, collection: collection_name, documentId: document_id }
            );
        }
    );

    server.tool(
        "upsert_document_by_id",
        {
            scope_name: z.string().describe("Name of the scope. Required. Use 'scope_name', not 'scope'."),
            collection_name: z.string().describe("Name of the collection. Required. Use 'collection_name', not 'collection'."),
            document_id: z.string().describe("ID of the document to upsert. Required. Use 'document_id', not 'id'."),
            document_content: z.string().describe("Content of the document as a JSON string. Required. Use 'document_content', not 'content'.")
        },
        async ({ scope_name, collection_name, document_id, document_content }) => {
            docLogger.info("upsertDocumentById received", { scope_name, collection_name, document_id, document_content });
            if (!scope_name) throw createError('VALIDATION_ERROR', "Missing required parameter: scope_name");
            if (!collection_name) throw createError('VALIDATION_ERROR', "Missing required parameter: collection_name");
            if (!document_id) throw createError('VALIDATION_ERROR', "Missing required parameter: document_id");
            if (!document_content) throw createError('VALIDATION_ERROR', "Missing required parameter: document_content");
            let parsedContent;
            try {
                parsedContent = JSON.parse(document_content);
            } catch (e) {
                throw createError('VALIDATION_ERROR', "document_content must be a valid JSON string");
            }
            if (typeof parsedContent !== 'object' || Array.isArray(parsedContent) || Object.keys(parsedContent).length === 0) {
                throw createError('VALIDATION_ERROR', "document_content must be a non-empty JSON object");
            }
            return handleOperation(
                async () => {
                    if (!bucket) {
                        docLogger.error('Bucket not initialized');
                        throw createError('DB_ERROR', "Bucket is not initialized");
                    }
                    docLogger.info('Accessing collection', {
                        bucket: bucket.name,
                        scope: scope_name,
                        collection: collection_name,
                        documentId: document_id
                    });
                    const collection = bucket.scope(scope_name).collection(collection_name);
                    await collection.upsert(document_id, parsedContent);
                    docLogger.info('Document upserted successfully', {
                        scope: scope_name,
                        collection: collection_name,
                        documentId: document_id
                    });
                    return formatDocumentResponse('Upsert', scope_name, collection_name, document_id, parsedContent);
                },
                'DB_ERROR',
                'upserting document',
                { scope: scope_name, collection: collection_name, documentId: document_id }
            );
        }
    );

    server.tool(
        "delete_document_by_id",
        {
            scope_name: z.string().describe("Name of the scope. Required. Use 'scope_name', not 'scope'."),
            collection_name: z.string().describe("Name of the collection. Required. Use 'collection_name', not 'collection'."),
            document_id: z.string().describe("ID of the document to delete. Required. Use 'document_id', not 'id'.")
        },
        async ({ scope_name, collection_name, document_id }) => {
            docLogger.info("deleteDocumentById received", { scope_name, collection_name, document_id });
            if (!scope_name) throw createError('VALIDATION_ERROR', "Missing required parameter: scope_name");
            if (!collection_name) throw createError('VALIDATION_ERROR', "Missing required parameter: collection_name");
            if (!document_id) throw createError('VALIDATION_ERROR', "Missing required parameter: document_id");
            return handleOperation(
                async () => {
                    if (!bucket) {
                        docLogger.error('Bucket not initialized');
                        throw createError('DB_ERROR', "Bucket is not initialized");
                    }
                    docLogger.info('Accessing collection', {
                        bucket: bucket.name,
                        scope: scope_name,
                        collection: collection_name,
                        documentId: document_id
                    });
                    const collection = bucket.scope(scope_name).collection(collection_name);
                    await collection.remove(document_id);
                    docLogger.info('Document deleted successfully', {
                        scope: scope_name,
                        collection: collection_name,
                        documentId: document_id
                    });
                    return formatDocumentResponse('Delete', scope_name, collection_name, document_id);
                },
                'DB_ERROR',
                'deleting document',
                { scope: scope_name, collection: collection_name, documentId: document_id }
            );
        }
    );
};