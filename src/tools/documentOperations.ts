/* src/tools/documentOperations.ts */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, createContextLogger } from "../lib/logger";
import type { Bucket } from "couchbase";
import { withErrorHandling } from "./toolUtils";
import { handleOperation } from "../lib/errorUtils";
import { createError } from "../lib/errors";

const docLogger = createContextLogger('DocumentOps');

const formatDocument = (doc: any): string => {
    return JSON.stringify(doc, null, 2);
};

export const getDocumentById = async (params: any, bucket: Bucket) => {
    return handleOperation(
        async () => {
            const { scope_name, collection_name, document_id } = params;
            docLogger.info('Retrieving document', {
                scope: scope_name,
                collection: collection_name,
                documentId: document_id
            });

            if (!scope_name || !collection_name || !document_id) {
                docLogger.error('Missing required parameters', {
                    hasScope: !!scope_name,
                    hasCollection: !!collection_name,
                    hasDocumentId: !!document_id
                });
                throw createError('VALIDATION_ERROR', `Missing required parameters: scope_name=${scope_name}, collection_name=${collection_name}, document_id=${document_id}`);
            }
            if (!bucket) {
                docLogger.error('Bucket not initialized');
                throw createError('DB_ERROR', "Bucket is not initialized");
            }
            
            const collection = bucket.scope(scope_name).collection(collection_name);
            const result = await collection.get(document_id);
            
            docLogger.info('Document retrieved successfully', {
                scope: scope_name,
                collection: collection_name,
                documentId: document_id
            });
            
            const formattedText = `📄 Document Details:
Location: ${scope_name}/${collection_name}/${document_id}
Content:
${formatDocument(result.content)}`;
            
            return {
                content: [
                    {
                        type: "text" as const,
                        text: formattedText
                    }
                ]
            };
        },
        'DB_ERROR',
        'retrieving document',
        { scope: params.scope_name, collection: params.collection_name, documentId: params.document_id }
    );
};

export const upsertDocumentById = async (params: any, bucket: Bucket) => {
    return handleOperation(
        async () => {
            const { scope_name, collection_name, document_id, document_content } = params || {};
            
            // More thorough validation with descriptive messages
            if (!scope_name) {
                throw createError('VALIDATION_ERROR', "Missing required parameter: scope_name");
            }
            if (!collection_name) {
                throw createError('VALIDATION_ERROR', "Missing required parameter: collection_name");
            }
            if (!document_id) {
                throw createError('VALIDATION_ERROR', "Missing required parameter: document_id");
            }
            
            // Validate document_content specifically
            if (!document_content) {
                throw createError('VALIDATION_ERROR', "Missing required parameter: document_content");
            }
            if (typeof document_content !== 'object') {
                throw createError('VALIDATION_ERROR', "document_content must be an object");
            }
            if (Object.keys(document_content).length === 0) {
                throw createError('VALIDATION_ERROR', "document_content cannot be an empty object");
            }
            
            if (!bucket) {
                throw createError('DB_ERROR', "Bucket is not initialized");
            }
            
            const collection = bucket.scope(scope_name).collection(collection_name);
            await collection.upsert(document_id, document_content);
            
            const formattedText = `✅ Document Operation Successful
Action: Upsert
Location: ${scope_name}/${collection_name}/${document_id}
Content:
${formatDocument(document_content)}`;
            
            return {
                content: [
                    {
                        type: "text" as const,
                        text: formattedText
                    }
                ]
            };
        },
        'DB_ERROR',
        'upserting document',
        { 
            scope: params?.scope_name, 
            collection: params?.collection_name, 
            documentId: params?.document_id 
        }
    );
};

export const deleteDocumentById = async (params: any, bucket: Bucket) => {
    return handleOperation(
        async () => {
            const { scope_name, collection_name, document_id } = params;
            
            if (!scope_name || !collection_name || !document_id) {
                throw createError('VALIDATION_ERROR', `Missing required parameters: scope_name=${scope_name}, collection_name=${collection_name}, document_id=${document_id}`);
            }
            if (!bucket) {
                throw createError('DB_ERROR', "Bucket is not initialized");
            }
            
            const collection = bucket.scope(scope_name).collection(collection_name);
            await collection.remove(document_id);
            
            const formattedText = `✅ Document Operation Successful
Action: Delete
Location: ${scope_name}/${collection_name}/${document_id}`;
            
            return {
                content: [
                    {
                        type: "text" as const,
                        text: formattedText
                    }
                ]
            };
        },
        'DB_ERROR',
        'deleting document',
        { 
            scope: params?.scope_name, 
            collection: params?.collection_name, 
            documentId: params?.document_id 
        }
    );
};

export const getDocumentByIdHandler = withErrorHandling(getDocumentById, 'DB_ERROR', 'getting document');
export const upsertDocumentByIdHandler = withErrorHandling(upsertDocumentById, 'DB_ERROR', 'upserting document');
export const deleteDocumentByIdHandler = withErrorHandling(deleteDocumentById, 'DB_ERROR', 'deleting document');

export default (server: McpServer, bucket: Bucket) => {
    server.tool(
        "get_document_by_id",
        "Get a document by its ID from the specified scope and collection.",
        {
            scope_name: z.string().describe("Name of the scope"),
            collection_name: z.string().describe("Name of the collection"),
            document_id: z.string().describe("ID of the document to retrieve")
        },
        async (params: any) => {
            if (!params || typeof params !== 'object') {
                throw new Error("Missing required arguments object");
            }
            return getDocumentByIdHandler(params, bucket);
        }
    );

    server.tool(
        "upsert_document_by_id",
        "Insert or update a document by its ID.",
        {
            scope_name: z.string().describe("Name of the scope"),
            collection_name: z.string().describe("Name of the collection"),
            document_id: z.string().describe("ID of the document to upsert"),
            document_content: z.record(z.any()).refine(obj => Object.keys(obj).length > 0, {
                message: "Document content cannot be empty"
            }).describe("Content of the document")
        },
        async (params: any) => {
            if (!params || typeof params !== 'object') {
                throw new Error("Missing required arguments object");
            }
            return upsertDocumentByIdHandler(params, bucket);
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
        async (params: any) => {
            if (!params || typeof params !== 'object') {
                throw new Error("Missing required arguments object");
            }
            return deleteDocumentByIdHandler(params, bucket);
        }
    );
};