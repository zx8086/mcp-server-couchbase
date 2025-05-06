/* src/tools/toolFactory.ts */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Bucket } from "couchbase";
import { z } from "zod";
import { handleCouchbaseError } from "../lib/errorUtils";
import { AppError } from "../lib/errors";

type ToolHandler<T extends z.ZodType> = (params: z.infer<T>, bucket: Bucket) => Promise<any>;

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

export function createTool<T extends z.ZodType>(
    name: string,
    description: string,
    paramSchema: T,
    handler: ToolHandler<T>
) {
    return (server: McpServer, bucket: Bucket): void => {
        server.tool(
            name,
            description,
            paramSchema,
            async (params: z.infer<T>) => withErrorHandling(handler, 'DB_ERROR', name)(params, bucket)
        );
    };
} 