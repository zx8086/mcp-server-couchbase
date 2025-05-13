/* tests/integration.test.ts */

import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { getCluster } from "../src/lib/couchbaseConnector";
import { logger } from "../src/lib/logger";
import type { capellaConn } from "../src/types";
import { MockMcpServer } from "./tools.test";
import toolRegistry from "../src/tools";
import { createServer } from "../src/index";

describe("Integration Tests", () => {
  let connection: capellaConn;
  let mockServer: MockMcpServer;
  let server: any;
  const TEST_DOC_ID = "integration_test_doc";

  beforeAll(async () => {
    connection = await getCluster();
    mockServer = new MockMcpServer();
    Object.entries(toolRegistry).forEach(([name, handler]) => {
      handler(mockServer as any, connection.defaultBucket);
    });
    server = await createServer(connection);
  });

  afterAll(async () => {
    if (connection?.defaultBucket) {
      const collection = connection.defaultBucket.scope("_default").collection("_default");
      try {
        await collection.remove(TEST_DOC_ID);
      } catch (error) {
        logger.info(`No test document to clean up: ${TEST_DOC_ID}`);
      }
      if (connection.cluster) {
        await connection.cluster.close();
      }
    }
  });

  describe("Tool Interaction Tests", () => {
    test("should handle document lifecycle with schema validation", async () => {
      const upsertHandler = mockServer.registeredTools["upsert_document_by_id"].handler;
      const getHandler = mockServer.registeredTools["get_document_by_id"].handler;
      const schemaHandler = mockServer.registeredTools["get_schema_for_collection"].handler;
      const deleteHandler = mockServer.registeredTools["delete_document_by_id"].handler;

      // 1. Get schema first
      const schemaResult = await schemaHandler({
        scope_name: "_default",
        collection_name: "_default"
      });
      expect(schemaResult).toBeDefined();

      // 2. Create document
      const testDoc = {
        name: "Integration Test",
        created: new Date().toISOString(),
        status: "active",
        metadata: {
          version: 1,
          tags: ["test", "integration"]
        }
      };

      const createResult = await upsertHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID,
        document_content: JSON.stringify(testDoc)
      });
      expect(createResult.content[0].text).toContain("successfully upserted");

      // 3. Read and verify document
      const readResult = await getHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID
      });
      const contentLines = readResult.content[0].text.split("\n");
      const contentStart = contentLines.findIndex(line => line.trim() === "Content:") + 1;
      const content = JSON.parse(contentLines.slice(contentStart).join("\n").trim());
      expect(content).toMatchObject(testDoc);

      // 4. Delete document
      const deleteResult = await deleteHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID
      });
      expect(deleteResult.content[0].text).toContain("successfully deleted");
    });

    test("should handle query with document operations", async () => {
      const queryHandler = mockServer.registeredTools["run_sql_plus_plus_query"].handler;
      const upsertHandler = mockServer.registeredTools["upsert_document_by_id"].handler;
      const getHandler = mockServer.registeredTools["get_document_by_id"].handler;

      // 1. Create test documents
      const testDocs = Array(5).fill(null).map((_, i) => ({
        id: `test_doc_${i}`,
        value: i,
        timestamp: new Date().toISOString()
      }));

      // Create documents
      await Promise.all(testDocs.map(doc => 
        upsertHandler({
          scope_name: "_default",
          collection_name: "_default",
          document_id: doc.id,
          document_content: JSON.stringify(doc)
        })
      ));

      // 2. Query documents
      const queryResult = await queryHandler({
        scope_name: "_default",
        query: "SELECT * FROM `default`.`_default`.`_default` USE KEYS 'test_doc_3'"
      });
      expect(queryResult).toBeDefined();
      expect(queryResult.content[0].text).toContain("Query returned");

      // 3. Verify individual documents
      for (const doc of testDocs) {
        const result = await getHandler({
          scope_name: "_default",
          collection_name: "_default",
          document_id: doc.id
        });
        const contentLines = result.content[0].text.split("\n");
        const contentStart = contentLines.findIndex(line => line.trim() === "Content:") + 1;
        const content = JSON.parse(contentLines.slice(contentStart).join("\n").trim());
        expect(content).toMatchObject(doc);
      }
    });
  });

  describe("Server Lifecycle Tests", () => {
    test("should handle server initialization and cleanup", async () => {
      expect(server).toBeDefined();
    });

    test("should register all required tools and resources", async () => {
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

  describe("Error Recovery Tests", () => {
    test("should recover from failed operations", async () => {
      const upsertHandler = mockServer.registeredTools["upsert_document_by_id"].handler;
      const getHandler = mockServer.registeredTools["get_document_by_id"].handler;

      // 1. Try to create document with invalid JSON
      await expect(upsertHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID,
        document_content: "invalid json"
      })).rejects.toThrow();

      // 2. Verify document doesn't exist
      await expect(getHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID
      })).rejects.toThrow();

      // 3. Create valid document
      const testDoc = { test: "recovery" };
      const createResult = await upsertHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID,
        document_content: JSON.stringify(testDoc)
      });
      expect(createResult.content[0].text).toContain("successfully upserted");

      // 4. Verify document exists
      const getResult = await getHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID
      });
      const contentLines = getResult.content[0].text.split("\n");
      const contentStart = contentLines.findIndex(line => line.trim() === "Content:") + 1;
      const content = JSON.parse(contentLines.slice(contentStart).join("\n").trim());
      expect(content).toEqual(testDoc);
    });
  });
}); 