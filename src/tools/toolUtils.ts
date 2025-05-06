/* src/tools/toolUtils.ts */

import type { Bucket } from "couchbase";
import { handleCouchbaseError } from "../lib/errorUtils";
import { AppError, createError } from "../lib/errors";
import { z } from "zod";

// Type for tool handler
export type ToolHandler<T extends z.ZodType> = (params: z.infer<T>, bucket: Bucket) => Promise<any>;

// Helper for validating common parameters
export function validateDocumentParams(params: any): void {
    const { scope_name, collection_name, document_id } = params || {};
    
    const missingParams = [];
    if (!scope_name) missingParams.push("scope_name");
    if (!collection_name) missingParams.push("collection_name");
    if (!document_id) missingParams.push("document_id");
    
    if (missingParams.length > 0) {
        throw createError('VALIDATION_ERROR', `Missing required parameter: ${missingParams[0]}`);
    }
}

// Helper for formatting responses
export function formatDocumentResponse(action: string, scope: string, collection: string, id: string, content?: any): any {
    let text = `✅ Document Operation Successful\nAction: ${action}\nLocation: ${scope}/${collection}/${id}`;
    
    if (content) {
        text += `\nContent:\n${JSON.stringify(content, null, 2)}`;
    }
    
    return {
        content: [{ type: "text" as const, text }]
    };
} 