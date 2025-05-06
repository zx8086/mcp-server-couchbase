import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "./logger";

const resourceLogger = logger.child({ context: 'Resources' });

// Helper functions to generate responses
export function getResourcesList() {
  return [
    {
      id: 'couchbase-database',
      name: 'Couchbase Database',
      description: 'Access and manage Couchbase database operations',
      type: 'database',
      capabilities: ['read', 'write', 'query']
    },
    {
      id: 'scopes-collections',
      name: 'Scopes and Collections',
      description: 'Manage Couchbase scopes and collections',
      type: 'container',
      capabilities: ['list', 'create', 'delete']
    },
    {
      id: 'schema',
      name: 'Schema',
      description: 'Access and manage database schema',
      type: 'metadata',
      capabilities: ['read', 'validate']
    },
    {
      id: 'query-engine',
      name: 'SQL++ Query Engine',
      description: 'Execute SQL++ queries on the database',
      type: 'query',
      capabilities: ['execute', 'explain']
    }
  ];
}

export function getPromptsList() {
  return [
    {
      id: 'query-generator',
      name: 'Query Generator',
      description: 'Generate SQL++ queries based on natural language',
      type: 'generator',
      capabilities: ['generate', 'explain']
    },
    {
      id: 'schema-analyzer',
      name: 'Schema Analyzer',
      description: 'Analyze and validate database schema',
      type: 'analyzer',
      capabilities: ['analyze', 'validate']
    },
    {
      id: 'document-validator',
      name: 'Document Validator',
      description: 'Validate document structure and content',
      type: 'validator',
      capabilities: ['validate', 'suggest']
    },
    {
      id: 'index-advisor',
      name: 'Index Advisor',
      description: 'Suggest optimal indexes for queries',
      type: 'advisor',
      capabilities: ['analyze', 'suggest']
    }
  ];
}

export function registerResourceMethods(server: McpServer): void {
  // Register as tools
  server.tool(
    "resources/list",
    "List available resources",
    {},
    async () => {
      resourceLogger.info('Listing available resources');
      return getResourcesList();
    }
  );

  server.tool(
    "prompts/list",
    "List available prompts",
    {},
    async () => {
      resourceLogger.info('Listing available prompts');
      return getPromptsList();
    }
  );
} 