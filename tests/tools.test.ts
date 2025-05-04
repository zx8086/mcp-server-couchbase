
/* tests/tools.test.ts */

import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { getCluster } from "../src/lib/clusterProvider";
import { logger } from "../src/lib/logger";
import { config } from "../src/config";
import { SQLPPParserImpl } from "../src/lib/sqlppParser";
import { sleep } from "../src/utils/helpers";
import type { capellaConn, ToolContext } from "../src/types";

// Import the tool handlers
import getScopesAndCollections from "../src/tools/getScopesAndCollections";
import getSchemaForCollection from "../src/tools/getSchemaForCollection";
import documentOperations from "../src/tools/documentOperations";
import runSqlPlusPlusQuery from "../src/tools/runSqlPlusPlusQuery";

// Mock McpServer for testing tool registration
class MockMcpServer {
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
  const TEST_DOC_ID = "startup_test_doc";
  
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
      
      // Register tools with mock server
      getScopesAndCollections(mockServer, connection.defaultBucket);
      getSchemaForCollection(mockServer, connection.defaultBucket);
      documentOperations(mockServer, connection.defaultBucket);
      runSqlPlusPlusQuery(mockServer, connection.defaultBucket);
      
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
          // Ignore not found errors during cleanup
          logger.info(`No test document to clean up: ${TEST_DOC_ID}`);
        }
      }
      
      logger.info("Test environment cleanup complete");
    } catch (error) {
      logger.error(`Test cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Configuration Tests
  describe("Configuration Tests", () => {
    test("should have valid server configuration", () => {
      expect(config.server).toBeDefined();
      expect(config.server.name).toBeDefined();
      expect(config.server.version).toBeDefined();
      expect(config.server.port).toBeDefined();
      expect(config.server.transportMode).toBeDefined();
      expect(config.server.readOnlyQueryMode).toBeDefined();
    });

    test("should have valid read-only query mode setting", () => {
      expect(typeof config.server.readOnlyQueryMode).toBe("boolean");
    });

    test("should have valid Couchbase configuration", () => {
      expect(config.couchbase).toBeDefined();
      expect(config.couchbase.url).toBeDefined();
      expect(config.couchbase.username).toBeDefined();
      expect(config.couchbase.password).toBeDefined();
      expect(config.couchbase.bucket).toBeDefined();
      expect(config.couchbase.scope).toBeDefined();
      expect(config.couchbase.collection).toBeDefined();
    });
  });

  // SQL++ Parser Tests
  describe("SQL++ Parser Tests", () => {
    const parser = new SQLPPParserImpl();

    test("should parse simple SELECT query", () => {
      const query = "SELECT * FROM `_default`";
      const ast = parser.parse(query);
      expect(ast).toBeDefined();
      expect(ast.type).toBe("ROOT");
      expect(parser.modifiesData(ast)).toBe(false);
      expect(parser.modifiesStructure(ast)).toBe(false);
    });

    test("should detect data modification queries", () => {
      const queries = [
        "INSERT INTO `_default` VALUES { 'test': 1 }",
        "UPDATE `_default` SET test = 1",
        "DELETE FROM `_default` WHERE test = 1"
      ];

      queries.forEach(query => {
        const ast = parser.parse(query);
        expect(parser.modifiesData(ast)).toBe(true);
      });
    });

    test("should detect structure modification queries", () => {
      const queries = [
        "CREATE INDEX idx_test ON `_default`(test)",
        "DROP INDEX `_default`.idx_test",
        "CREATE COLLECTION `_default`.test"
      ];

      queries.forEach(query => {
        const ast = parser.parse(query);
        expect(parser.modifiesStructure(ast)).toBe(true);
      });
    });

    test("should handle comments in queries", () => {
      const query = "/* Test comment */ SELECT * FROM `_default` -- Another comment";
      const ast = parser.parse(query);
      expect(ast).toBeDefined();
      expect(ast.type).toBe("ROOT");
    });
  });
  
  // Tool Registration Tests
  describe("Tool Registration Tests", () => {
    test("should register all required tools", () => {
      const requiredTools = [
        "get_scopes_and_collections_in_bucket",
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
  
  // Operation Tests
  describe("Operation Tests", () => {
    test("1. List all scopes and collections", async () => {
      const handler = mockServer.registeredTools["get_scopes_and_collections_in_bucket"].handler;
      const result = await handler({});
      
      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe("text");
      
      // Parse the JSON to verify structure
      const resultText = result.content[0].text;
      const jsonStart = resultText.indexOf("{");
      const jsonEnd = resultText.lastIndexOf("}");
      const jsonStr = resultText.substring(jsonStart, jsonEnd + 1);
      const scopesCollections = JSON.parse(jsonStr);
      
      expect(scopesCollections).toBeInstanceOf(Object);
      expect(scopesCollections).toHaveProperty("_default");
      
      logger.info("Test passed: List all scopes and collections");
    });

    test("should handle invalid scope name", async () => {
      const handler = mockServer.registeredTools["get_schema_for_collection"].handler;
      await expect(handler({
        scope_name: "non_existent_scope",
        collection_name: "_default"
      })).rejects.toThrow();
    });
    
    test("2. Get schema for default collection", async () => {
      const handler = mockServer.registeredTools["get_schema_for_collection"].handler;
      const result = await handler({
        scope_name: "_default",
        collection_name: "_default"
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe("text");
      
      logger.info("Test passed: Get schema for default collection");
    });
    
    test("3. Document operations - upsert, get, delete sequence", async () => {
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
      
      // 3.1 Upsert document
      const upsertResult = await upsertHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID,
        document_content: testDoc
      });
      
      expect(upsertResult).toBeDefined();
      expect(upsertResult.content[0].text).toContain("Successfully upserted document");
      logger.info("Test passed: Upsert document");
      
      // Wait a moment for the operation to complete
      await sleep(1000);
      
      // 3.2 Get document
      const getResult = await getHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID
      });
      
      expect(getResult).toBeDefined();
      expect(getResult.content[0].text).toContain(TEST_DOC_ID);
      
      // Parse the JSON to verify document content
      const resultText = getResult.content[0].text;
      const contentStart = resultText.indexOf("\n") + 1;
      const docContent = JSON.parse(resultText.substring(contentStart));
      
      expect(docContent).toHaveProperty("text", testDoc.text);
      expect(docContent).toHaveProperty("at");
      logger.info("Test passed: Get document");
      
      // Wait a moment for the operation to complete
      await sleep(1000);
      
      // 3.3 Delete document
      const deleteResult = await deleteHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID
      });
      
      expect(deleteResult).toBeDefined();
      expect(deleteResult.content[0].text).toContain("Successfully deleted document");
      logger.info("Test passed: Delete document");
    });

    test("should handle non-existent document", async () => {
      const handler = mockServer.registeredTools["get_document_by_id"].handler;
      await expect(handler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: "non_existent_doc"
      })).rejects.toThrow();
    });

    test("should handle large document", async () => {
      const handler = mockServer.registeredTools["upsert_document_by_id"].handler;
      const largeDoc = {
        data: "x".repeat(1024 * 1024) // 1MB of data
      };

      const result = await handler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: "large_doc_" + Date.now(),
        document_content: largeDoc
      });

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain("Successfully");
    });
    
    test("4. Run SQL++ query", async () => {
      const handler = mockServer.registeredTools["run_sql_plus_plus_query"].handler;
      const result = await handler({
        scope_name: "_default",
        query: "SELECT META().id, * FROM `_default` LIMIT 1"
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe("text");
      
      logger.info("Test passed: Run SQL++ query");
    });

    test("should handle invalid SQL++ query", async () => {
      const handler = mockServer.registeredTools["run_sql_plus_plus_query"].handler;
      await expect(handler({
        scope_name: "_default",
        query: "INVALID SQL QUERY"
      })).rejects.toThrow();
    });

    test("should handle read-only mode for data modification queries", async () => {
      const handler = mockServer.registeredTools["run_sql_plus_plus_query"].handler;
      await expect(handler({
        scope_name: "_default",
        query: "INSERT INTO `_default` VALUES { 'test': 1 }"
      })).rejects.toThrow();
    });
  });
}); 
