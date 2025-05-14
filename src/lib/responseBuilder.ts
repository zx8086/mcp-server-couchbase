/* src/lib/responseBuilder.ts */

import type { ToolResponse } from '../types';

export interface ResponseOptions {
  type?: 'text' | 'json' | 'markdown';
  format?: boolean;
}

export class ResponseBuilder {
  static success(content: string | object, options: ResponseOptions = {}): ToolResponse {
    const { type = 'text', format = true } = options;
    
    let text: string;
    if (typeof content === 'object') {
      text = format ? JSON.stringify(content, null, 2) : JSON.stringify(content);
    } else {
      text = content;
    }

    return {
      content: [{
        type: type as "text",
        text
      }]
    };
  }

  static error(message: string, error?: Error): ToolResponse {
    const errorDetails = error ? `\nDetails: ${error.message}` : '';
    return {
      content: [{
        type: "text",
        text: `Error: ${message}${errorDetails}`
      }]
    };
  }

  static markdown(content: string): ToolResponse {
    return {
      content: [{
        type: "text",
        text: content
      }]
    };
  }
} 