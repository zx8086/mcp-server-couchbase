/* src/lib/errorUtils.ts */

import { AppError, DocumentNotFoundError, createError } from './errors';
import type { Bucket } from 'couchbase';

export type HandlerFunction = (params: any, bucket: Bucket) => Promise<any>;

export const withErrorHandling = (
    handler: HandlerFunction,
    errorType: string,
    operation: string
) => async (params: any, bucket: Bucket) => {
    try {
        return await handler(params, bucket);
    } catch (error: any) {
        if (error.name === 'DocumentNotFoundError') {
            throw new DocumentNotFoundError(params.document_id);
        }
        throw createError(errorType, `Error ${operation} ${params.document_id || ''}`, {
            error: error.message,
            ...params
        });
    }
}; 