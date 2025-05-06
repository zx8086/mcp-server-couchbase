/* src/lib/errorUtils.ts */

import { AppError, createError } from './errors';
import type { ErrorCode } from './errors';
import type { CouchbaseError } from 'couchbase';
import { createContextLogger } from './logger';
import { logger } from "./logger";

const errorLogger = createContextLogger('ErrorHandler');

/**
 * Generic error handler for async operations
 * @param operation The operation to execute
 * @param errorCode The error code to use if the operation fails
 * @param operationName A descriptive name for the operation
 * @param metadata Additional metadata to include in the error
 */
export function handleOperation<T>(
  operation: () => Promise<T>,
  errorCode: ErrorCode,
  operationName: string,
  context: Record<string, any> = {}
): Promise<T> {
  return operation().catch((error: unknown) => {
    if (error instanceof AppError) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error during ${operationName}`, {
      metadata: {
        service: "couchbase-capella-mcp",
        context: "ErrorHandler",
        error: errorMessage,
        ...context
      }
    });
    
    throw createError(errorCode, `Error during ${operationName}: ${errorMessage}`);
  });
}

export function handleCouchbaseError(error: Error, params?: { document_id?: string; operation?: string }): never {
    // First check if it's an AppError
    if (error instanceof AppError) {
        errorLogger.debug('Handling AppError', {
            code: error.code,
            message: error.message,
            details: error.details
        });
        throw error;
    }
    
    const operation = params?.operation || 'database operation';
    
    // More specific error handling for document operations
    if (operation === 'upserting document') {
        if (error.message.includes('Cannot convert undefined or null to object')) {
            errorLogger.warn('Invalid document content', {
                operation,
                documentId: params?.document_id,
                error: error.message
            });
            throw createError('VALIDATION_ERROR', 'Invalid document content: document must be a non-empty object');
        }
        if (error.message.includes('scope not found')) {
            errorLogger.warn('Invalid scope name', {
                operation,
                documentId: params?.document_id,
                error: error.message
            });
            throw createError('VALIDATION_ERROR', 'Invalid scope name. Available scopes: _default, _system, s3, s3rag');
        }
        if (error.message.includes('collection not found')) {
            errorLogger.warn('Invalid collection name', {
                operation,
                documentId: params?.document_id,
                error: error.message
            });
            throw createError('VALIDATION_ERROR', 'Invalid collection name. Please check the collection exists in the specified scope');
        }
    }
    
    // Then check for Couchbase specific errors
    if (error.name === 'AuthenticationError') {
        errorLogger.error('Authentication failed', {
            operation,
            documentId: params?.document_id,
            error: error.message
        });
        throw createError('DB_ERROR', 'Authentication failed. Please check your credentials');
    }

    if (error.name === 'DocumentNotFoundError') {
        errorLogger.warn('Document not found', {
            operation,
            documentId: params?.document_id
        });
        throw createError('DOCUMENT_NOT_FOUND', `Document with ID ${params?.document_id || 'unknown'} not found`);
    }
    
    if (error.name === 'QueryError') {
        errorLogger.error('Query error', {
            operation,
            documentId: params?.document_id,
            error: error.message
        });
        throw createError('QUERY_ERROR', `Query error: ${error.message}`);
    }
    
    if (error.name === 'ValidationError') {
        errorLogger.warn('Validation error', {
            operation,
            documentId: params?.document_id,
            error: error.message
        });
        throw createError('VALIDATION_ERROR', `Validation error: ${error.message}`);
    }
    
    // For any other error, preserve the original message
    errorLogger.error('Unhandled database error', {
        operation,
        documentId: params?.document_id,
        error: error.message,
        errorName: error.name
    });
    throw createError('DB_ERROR', `Database error: ${error.message}`);
}

export function isCouchbaseError(error: any): error is CouchbaseError {
    return error && typeof error === 'object' && 'name' in error;
} 