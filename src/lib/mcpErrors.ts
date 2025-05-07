/* src/lib/mcpErrors.ts */

// Standard MCP error codes
export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR_START: -32099,
  SERVER_ERROR_END: -32000,
  SERVER_NOT_INITIALIZED: -32002,
  UNKNOWN_ERROR_CODE: -32001
} as const;

export class McpError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'McpError';
  }
  
  toResponseError() {
    return {
      code: this.code,
      message: this.message,
      data: this.data
    };
  }
}

export function createMcpError(code: number, message: string, data?: any): McpError {
  return new McpError(code, message, data);
}

// Helper functions for common error cases
export function createParseError(message: string = 'Parse error'): McpError {
  return createMcpError(MCP_ERROR_CODES.PARSE_ERROR, message);
}

export function createInvalidRequestError(message: string = 'Invalid request'): McpError {
  return createMcpError(MCP_ERROR_CODES.INVALID_REQUEST, message);
}

export function createMethodNotFoundError(method: string): McpError {
  return createMcpError(
    MCP_ERROR_CODES.METHOD_NOT_FOUND,
    `Method '${method}' not found`
  );
}

export function createInvalidParamsError(message: string = 'Invalid parameters'): McpError {
  return createMcpError(MCP_ERROR_CODES.INVALID_PARAMS, message);
}

export function createInternalError(message: string = 'Internal error'): McpError {
  return createMcpError(MCP_ERROR_CODES.INTERNAL_ERROR, message);
}

export function createServerNotInitializedError(): McpError {
  return createMcpError(
    MCP_ERROR_CODES.SERVER_NOT_INITIALIZED,
    'Server not initialized'
  );
} 