/* src/lib/errors.ts */

/**
 * Application-level error codes
 * These are used for internal application errors and are mapped to 
 * human-readable messages and HTTP status codes.
 */
export type ErrorCode = 
    | 'DOCUMENT_NOT_FOUND'
    | 'QUERY_ERROR'
    | 'VALIDATION_ERROR'
    | 'CONFIG_ERROR'
    | 'DB_ERROR'
    | 'UNKNOWN_ERROR'
    | 'AUTH_ERROR';

/**
 * Application Error class
 * Used for application-specific errors that relate to business logic
 * and application operations.
 */
export class AppError extends Error {
    constructor(
        public code: ErrorCode,
        message: string,
        public statusCode: number = 500,
        public details?: unknown
    ) {
        super(message);
        this.name = 'AppError';
    }
    
    /**
     * Converts to a MCP protocol error if needed
     * This provides a bridge between app errors and protocol errors
     */
    toMcpError(): any {
        // Import inside the method to avoid circular dependencies
        const { createMcpError, MCP_ERROR_CODES } = require('./mcpErrors');
        
        // Map app error codes to MCP error codes
        const mcpErrorCode = this.getMcpErrorCode();
        return createMcpError(mcpErrorCode, this.message, this.details);
    }
    
    /**
     * Maps app error codes to MCP error codes
     */
    private getMcpErrorCode(): number {
        // Import inside the method to avoid circular dependencies
        const { MCP_ERROR_CODES } = require('./mcpErrors');
        
        switch (this.code) {
            case 'DOCUMENT_NOT_FOUND':
                return MCP_ERROR_CODES.INVALID_PARAMS;
            case 'QUERY_ERROR':
                return MCP_ERROR_CODES.INVALID_PARAMS;
            case 'VALIDATION_ERROR':
                return MCP_ERROR_CODES.INVALID_PARAMS;
            case 'CONFIG_ERROR':
                return MCP_ERROR_CODES.SERVER_NOT_INITIALIZED;
            case 'DB_ERROR':
                return MCP_ERROR_CODES.INTERNAL_ERROR;
            default:
                return MCP_ERROR_CODES.UNKNOWN_ERROR_CODE;
        }
    }
}

// Map error codes to HTTP status codes
const statusCodes: Record<ErrorCode, number> = {
    'DOCUMENT_NOT_FOUND': 404,
    'QUERY_ERROR': 400,
    'VALIDATION_ERROR': 400,
    'CONFIG_ERROR': 500,
    'DB_ERROR': 500,
    'UNKNOWN_ERROR': 500,
    'AUTH_ERROR': 401
};

/**
 * Create an application error
 * @param code Error code
 * @param message Error message
 * @param details Additional error details
 */
export function createError(code: ErrorCode, message: string, details?: unknown): AppError {
    return new AppError(code, message, statusCodes[code], details);
}

/**
 * Format an error for HTTP responses
 * @param error Error to format
 */
export function formatErrorResponse(error: Error): { 
    error: string; 
    code: string; 
    message: string; 
    details?: any; 
} {
    if (error instanceof AppError) {
        return {
            error: error.name,
            code: error.code,
            message: error.message,
            details: error.details
        };
    }
    
    return {
        error: 'InternalServerError',
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred'
    };
} 