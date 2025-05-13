/* tests/tools.test.ts */

import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { getCluster } from "../src/lib/couchbaseConnector";
import { logger } from "../src/lib/logger";
import { config } from "../src/config";
import { SQLPPParserImpl } from "../src/lib/sqlppParser";
import { sleep } from "../src/utils/helpers";
import type { capellaConn, ToolContext } from "../src/types";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AppError, createError } from "../src/lib/errors";
import { CouchbaseError } from "couchbase";

// Import the tool handlers
import toolRegistry from "../src/tools";

// Mock McpServer for testing tool registration
export class MockMcpServer {
  registeredTools: Record<string, any> = {};
  
  tool(name: string, description: string, params: any, handler: any) {
    this.registeredTools[name] = { description, params, handler };
    return this;
  }
}

describe("Couchbase MCP Server Tool Tests", () => {
  let connection: capellaConn;
  let testCtx: ToolContext;
  let mockServer: MockMcpServer;
  const TEST_DOC_ID = "mcp_test_doc";
  
  // Setup - runs before all tests
  beforeAll(async () => {
    try {
      logger.info("Setting up test environment...");
      
      // Initialize connection
      connection = await getCluster();
      
      // Create test context
      testCtx = {
        lifespanContext: {
          bucket: connection.defaultBucket,
          readOnlyQueryMode: config.server.readOnlyQueryMode
        }
      };
      
      // Create mock server
      mockServer = new MockMcpServer();
      
      // Register all tools with mock server
      Object.entries(toolRegistry).forEach(([name, handler]) => {
        handler(mockServer as any, connection.defaultBucket);
      });
      
      logger.info("Test environment setup complete");
    } catch (error) {
      logger.error(`Test setup failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
  
  // Cleanup - runs after all tests
  afterAll(async () => {
    try {
      // Clean up any test documents that might be left
      if (connection && connection.defaultBucket) {
        const collection = connection.defaultBucket.scope("_default").collection("_default");
        try {
          await collection.remove(TEST_DOC_ID);
          logger.info(`Cleaned up test document: ${TEST_DOC_ID}`);
        } catch (error) {
          logger.info(`No test document to clean up: ${TEST_DOC_ID}`);
        }
      }
      // Explicitly close Couchbase cluster connection
      if (connection && connection.cluster) {
        await connection.cluster.close();
        logger.info("Closed Couchbase cluster connection");
      }
      logger.info("Test environment cleanup complete");
    } catch (error) {
      logger.error(`Test cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Tool Registration Tests
  describe("Tool Registration Tests", () => {
    test("should register all required tools", () => {
      const requiredTools = [
        "get_scopes_and_collections",
        "get_schema_for_collection",
        "get_document_by_id",
        "upsert_document_by_id",
        "delete_document_by_id",
        "run_sql_plus_plus_query"
      ];

      requiredTools.forEach(toolName => {
        expect(mockServer.registeredTools[toolName]).toBeDefined();
        expect(mockServer.registeredTools[toolName].handler).toBeDefined();
      });
    });
  });
  
  // Document Operations Tests
  describe("Document Operations Tests", () => {
    test("Document operations - upsert, get, delete sequence", async () => {
      // Get handlers
      const upsertHandler = mockServer.registeredTools["upsert_document_by_id"].handler;
      const getHandler = mockServer.registeredTools["get_document_by_id"].handler;
      const deleteHandler = mockServer.registeredTools["delete_document_by_id"].handler;
      
      // Test document content
      const testDoc = { 
        text: "Couchbase Capella MCP Server", 
        quote: "You can't trust quotes from the internet",
        author: "Abraham Lincoln",
        at: new Date().toISOString() 
      };
      
      // Upsert document
      const upsertResult = await upsertHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID,
        document_content: JSON.stringify(testDoc)
      });
      
      expect(upsertResult).toBeDefined();
      expect(upsertResult.content[0].text).toContain("successfully upserted");
      
      // Get document
      const getResult = await getHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID
      });
      
      expect(getResult).toBeDefined();
      expect(getResult.content[0].text).toContain(testDoc.text);
      
      // Parse the JSON to verify document content
      const resultText = getResult.content[0].text;
      const contentLines = resultText.split("\n");
      const contentStart = contentLines.findIndex(line => line.trim() === "Content:") + 1;
      const contentToProcess = contentLines.slice(contentStart).join("\n").trim();
      const docContent = JSON.parse(contentToProcess);
      
      expect(docContent).toHaveProperty("text", testDoc.text);
      expect(docContent).toHaveProperty("at");
      
      // Delete document
      const deleteResult = await deleteHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID
      });
      
      expect(deleteResult).toBeDefined();
      expect(deleteResult.content[0].text).toContain("successfully deleted");
    });

    test("should handle missing parameters", async () => {
      const getHandler = mockServer.registeredTools["get_document_by_id"].handler;
      const upsertHandler = mockServer.registeredTools["upsert_document_by_id"].handler;
      const deleteHandler = mockServer.registeredTools["delete_document_by_id"].handler;

      // Test get document
      await expect(getHandler({})).rejects.toThrow();

      // Test upsert document
      await expect(upsertHandler({})).rejects.toThrow();

      // Test delete document
      await expect(deleteHandler({})).rejects.toThrow();
    });

    test("should handle invalid document content", async () => {
      const handler = mockServer.registeredTools["upsert_document_by_id"].handler;
      
      await expect(handler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: "test_doc",
        document_content: "invalid json"
      })).rejects.toThrow();
    });
  });

  // SQL++ Query Tests
  describe("SQL++ Query Tests", () => {
    test("should execute read-only query", async () => {
      const queryHandler = mockServer.registeredTools["run_sql_plus_plus_query"].handler;
      const result = await queryHandler({
        scope_name: "_default",
        query: "SELECT META().id FROM `_default` LIMIT 1"
      });
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain("Query returned");
    });

    test("should reject data modification query in read-only mode", async () => {
      const queryHandler = mockServer.registeredTools["run_sql_plus_plus_query"].handler;
      
      await expect(queryHandler({
        scope_name: "_default",
        query: "INSERT INTO `_default` VALUES { 'test': 1 }"
      })).rejects.toThrow();
    });
  });

  // Schema Tests
  describe("Schema Tests", () => {
    test("should get schema for collection", async () => {
      const schemaHandler = mockServer.registeredTools["get_schema_for_collection"].handler;
      
      const result = await schemaHandler({
        scope_name: "_default",
        collection_name: "_default"
      });
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain("Schema");
    });
  });

  // Scopes and Collections Tests
  describe("Scopes and Collections Tests", () => {
    test("should get scopes and collections", async () => {
      const scopesHandler = mockServer.registeredTools["get_scopes_and_collections"].handler;
      const result = await scopesHandler({});
      expect(result).toBeDefined();
      expect(result.content[0].text.toLowerCase()).toContain("scopes and collections");
    });
  });

  // Operation Tests
  describe("Operation Tests", () => {
    test("should handle invalid scope name", async () => {
      const handler = mockServer.registeredTools["get_schema_for_collection"].handler;
      await expect(handler({
        scope_name: "non_existent_scope",
        collection_name: "_default"
      })).rejects.toThrow();
    });
    
    test("should get schema for default collection", async () => {
      const handler = mockServer.registeredTools["get_schema_for_collection"].handler;
      const result = await handler({
        scope_name: "_default",
        collection_name: "_default"
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe("text");
    });
  });

  // Transport Tests
  describe("Transport Tests", () => {
    test("should initialize stdio transport correctly", () => {
      const transport = new StdioServerTransport();
      expect(transport).toBeDefined();
    });
  });

  // Error Handling Tests
  describe("Error Handling Tests", () => {
    test("should handle validation errors", async () => {
      const handler = mockServer.registeredTools["upsert_document_by_id"].handler;
      await expect(handler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: "",
        document_content: "{}"
      })).rejects.toThrow();
    });

    test("should handle query errors", async () => {
      const handler = mockServer.registeredTools["run_sql_plus_plus_query"].handler;
      await expect(handler({
        query: "INVALID SQL QUERY"
      })).rejects.toThrow();
    });

    test("should handle configuration errors", async () => {
      const handler = mockServer.registeredTools["get_schema_for_collection"].handler;
      await expect(handler({
        scope_name: "non_existent_scope",
        collection_name: "_default"
      })).rejects.toThrow();
    });

    test("should handle concurrent operations", async () => {
      const upsertHandler = mockServer.registeredTools["upsert_document_by_id"].handler;
      const testDoc = { test: "concurrent" };
      const concurrentOperations = Array(5).fill(null).map((_, i) => 
        upsertHandler({
          scope_name: "_default",
          collection_name: "_default",
          document_id: `concurrent_doc_${i}`,
          document_content: JSON.stringify(testDoc)
        })
      );

      const results = await Promise.all(concurrentOperations);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.content[0].text).toContain("successfully upserted");
      });
    });

    test("should handle special characters in document IDs", async () => {
      const handler = mockServer.registeredTools["upsert_document_by_id"].handler;
      const specialId = "test@#$%^&*()_+{}|:<>?";
      const testDoc = { test: "special chars" };

      const result = await handler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: specialId,
        document_content: JSON.stringify(testDoc)
      });

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain("successfully upserted");
    });
  });

  // Integration Tests
  describe("Integration Tests", () => {
    test("should complete full document lifecycle", async () => {
      const testDoc = {
        name: "Test Document",
        created: new Date().toISOString(),
        status: "active"
      };
      const docId = "lifecycle_test_doc";

      // 1. Create document
      const createResult = await mockServer.registeredTools["upsert_document_by_id"].handler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: docId,
        document_content: JSON.stringify(testDoc)
      });
      expect(createResult.content[0].text).toContain("successfully upserted");

      // 2. Read document
      const readResult = await mockServer.registeredTools["get_document_by_id"].handler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: docId
      });
      const readContentLines = readResult.content[0].text.split("\n");
      const readContentStart = readContentLines.findIndex(line => line.trim() === "Content:") + 1;
      const readContent = JSON.parse(readContentLines.slice(readContentStart).join("\n").trim());
      expect(readContent).toMatchObject(testDoc);

      // 3. Delete document
      const deleteResult = await mockServer.registeredTools["delete_document_by_id"].handler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: docId
      });
      expect(deleteResult.content[0].text).toContain("successfully deleted");
    });

    test("should maintain state between operations", async () => {
      const testDoc = { counter: 0 };
      const docId = "state_test_doc";

      // Initial state
      await mockServer.registeredTools["upsert_document_by_id"].handler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: docId,
        document_content: JSON.stringify(testDoc)
      });

      // Perform multiple updates
      for (let i = 1; i <= 5; i++) {
        const updatedDoc = { counter: i };
        await mockServer.registeredTools["upsert_document_by_id"].handler({
          scope_name: "_default",
          collection_name: "_default",
          document_id: docId,
          document_content: JSON.stringify(updatedDoc)
        });

        // Verify state after each update
        const result = await mockServer.registeredTools["get_document_by_id"].handler({
          scope_name: "_default",
          collection_name: "_default",
          document_id: docId
        });
        const contentLines = result.content[0].text.split("\n");
        const contentStart = contentLines.findIndex(line => line.trim() === "Content:") + 1;
        const content = JSON.parse(contentLines.slice(contentStart).join("\n").trim());
        expect(content.counter).toBe(i);
      }

      // Cleanup
      await mockServer.registeredTools["delete_document_by_id"].handler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: docId
      });
    });
  });
}); 
