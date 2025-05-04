export class AppError extends Error {
    constructor(message: string, public code: string = 'INTERNAL_ERROR', public status: number = 500) {
        super(message);
        this.name = 'AppError';
    }
}

export class DocumentNotFoundError extends AppError {
    constructor(id: string) {
        super(`Document ${id} not found`, 'NOT_FOUND', 404);
        this.name = 'DocumentNotFoundError';
    }
}

export class InvalidQueryError extends AppError {
    constructor(message: string) {
        super(message, 'INVALID_QUERY', 400);
        this.name = 'InvalidQueryError';
    }
}

export class DatabaseError extends AppError {
    constructor(message: string) {
        super(message, 'DATABASE_ERROR', 500);
        this.name = 'DatabaseError';
    }
} 