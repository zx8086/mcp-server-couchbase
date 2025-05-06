/* src/lib/errors.ts */

export type ErrorCode = 
    | 'DOCUMENT_NOT_FOUND'
    | 'QUERY_ERROR'
    | 'VALIDATION_ERROR'
    | 'CONFIG_ERROR'
    | 'DB_ERROR'
    | 'UNKNOWN_ERROR';

export class AppError extends Error {
    constructor(
        public code: ErrorCode,
        message: string,
        public statusCode: number = 500,
        public details?: any
    ) {
        super(message);
        this.name = 'AppError';
    }
}

const statusCodes: Record<ErrorCode, number> = {
    'DOCUMENT_NOT_FOUND': 404,
    'QUERY_ERROR': 400,
    'VALIDATION_ERROR': 400,
    'CONFIG_ERROR': 500,
    'DB_ERROR': 500,
    'UNKNOWN_ERROR': 500
};

export function createError(code: ErrorCode, message: string, details?: any): AppError {
    return new AppError(code, message, statusCodes[code], details);
}

// Error response formatter
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