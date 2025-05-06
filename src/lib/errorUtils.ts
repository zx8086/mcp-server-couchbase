/* src/lib/errorUtils.ts */

import { AppError, createError } from './errors';
import type { CouchbaseError } from 'couchbase';

export function handleCouchbaseError(error: Error, params?: { document_id?: string }): never {
    // First check if it's an AppError
    if (error instanceof AppError) {
        throw error;
    }
    
    // Then check for Couchbase specific errors
    if (error.name === 'AuthenticationError') {
        throw createError('DB_ERROR', error.message);
    }

    if (error.name === 'DocumentNotFoundError') {
        throw createError('DOCUMENT_NOT_FOUND', `Document with ID ${params?.document_id || 'unknown'} not found`);
    }
    
    if (error.name === 'QueryError') {
        throw createError('QUERY_ERROR', error.message);
    }
    
    if (error.name === 'ValidationError') {
        throw createError('VALIDATION_ERROR', error.message);
    }
    
    // For any other error, preserve the original message
    throw createError('DB_ERROR', error.message);
}

export function isCouchbaseError(error: any): error is CouchbaseError {
    return error && typeof error === 'object' && 'name' in error;
} 