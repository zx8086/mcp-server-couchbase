import type { Bucket } from "couchbase";
import { handleCouchbaseError } from "../lib/errorUtils";
import { AppError } from "../lib/errors";
import { z } from "zod";

// Type for tool handler
export type ToolHandler<T extends z.ZodType> = (params: z.infer<T>, bucket: Bucket) => Promise<any>;

export function withErrorHandling<T extends z.ZodType>(
    handler: ToolHandler<T>,
    errorCode: string,
    toolName: string
): ToolHandler<T> {
    return async (params: z.infer<T>, bucket: Bucket) => {
        try {
            return await handler(params, bucket);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            if (error instanceof Error && error.name === 'DocumentNotFoundError') {
                throw new Error(`Document with ID ${params['document_id']} not found`);
            }
            throw handleCouchbaseError(error as Error, { 
                toolName,
                document_id: params['document_id']
            });
        }
    };
} 