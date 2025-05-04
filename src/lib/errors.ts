// Base error class for the application
export class AppError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 500,
        public details?: any
    ) {
        super(message);
        this.name = 'AppError';
    }
}

// Database related errors
export class DatabaseError extends AppError {
    constructor(message: string, details?: any) {
        super('DB_ERROR', message, 500, details);
        this.name = 'DatabaseError';
    }
}

export class DocumentNotFoundError extends AppError {
    constructor(id: string) {
        super('DOCUMENT_NOT_FOUND', `Document with ID ${id} not found`, 404);
        this.name = 'DocumentNotFoundError';
    }
}

export class QueryError extends AppError {
    constructor(message: string, details?: any) {
        super('QUERY_ERROR', message, 400, details);
        this.name = 'QueryError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super('VALIDATION_ERROR', message, 400, details);
        this.name = 'ValidationError';
    }
}

export class ConfigurationError extends AppError {
    constructor(message: string, details?: any) {
        super('CONFIG_ERROR', message, 500, details);
        this.name = 'ConfigurationError';
    }
}

// Error factory function
export function createError(type: string, message: string, details?: any): AppError {
    switch (type) {
        case 'DOCUMENT_NOT_FOUND':
            return new DocumentNotFoundError(details?.id || 'unknown');
        case 'QUERY_ERROR':
            return new QueryError(message, details);
        case 'VALIDATION_ERROR':
            return new ValidationError(message, details);
        case 'CONFIG_ERROR':
            return new ConfigurationError(message, details);
        case 'DB_ERROR':
            return new DatabaseError(message, details);
        default:
            return new AppError('UNKNOWN_ERROR', message, 500, details);
    }
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
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'An unexpected error occurred'
    };
} 