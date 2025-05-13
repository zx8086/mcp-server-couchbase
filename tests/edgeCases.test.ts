/* tests/edgeCases.test.ts */

import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { getCluster } from "../src/lib/couchbaseConnector";
import { logger } from "../src/lib/logger";
import type { capellaConn } from "../src/types";
import { MockMcpServer } from "./tools.test";
import toolRegistry from "../src/tools";

describe("Edge Cases and Error Scenarios", () => {
  let connection: capellaConn;
  let mockServer: MockMcpServer;
  const TEST_DOC_ID = "edge_case_test_doc";

  beforeAll(async () => {
    connection = await getCluster();
    mockServer = new MockMcpServer();
    Object.entries(toolRegistry).forEach(([name, handler]) => {
      handler(mockServer as any, connection.defaultBucket);
    });
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

  describe("Concurrent Operations", () => {
    test("should handle concurrent operations on same document", async () => {
      const upsertHandler = mockServer.registeredTools["upsert_document_by_id"].handler;
      const getHandler = mockServer.registeredTools["get_document_by_id"].handler;
      
      // Create initial document
      await upsertHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID,
        document_content: JSON.stringify({ counter: 0 })
      });

      // Perform concurrent updates
      const concurrentUpdates = Array(3).fill(null).map((_, i) => 
        upsertHandler({
          scope_name: "_default",
          collection_name: "_default",
          document_id: TEST_DOC_ID,
          document_content: JSON.stringify({ counter: i + 1 })
        })
      );

      await Promise.all(concurrentUpdates);

      // Verify final state
      const result = await getHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID
      });

      const contentLines = result.content[0].text.split("\n");
      const contentStart = contentLines.findIndex(line => line.trim() === "Content:") + 1;
      const content = JSON.parse(contentLines.slice(contentStart).join("\n").trim());
      
      expect(content).toHaveProperty("counter");
      expect(typeof content.counter).toBe("number");
    });
  });

  describe("Large Document Handling", () => {
    test("should handle large document operations", async () => {
      const upsertHandler = mockServer.registeredTools["upsert_document_by_id"].handler;
      const getHandler = mockServer.registeredTools["get_document_by_id"].handler;
      
      // Create a large document (1MB of data)
      const largeDoc = {
        data: "x".repeat(1024 * 1024),
        timestamp: new Date().toISOString()
      };

      // Upsert large document
      const upsertResult = await upsertHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID,
        document_content: JSON.stringify(largeDoc)
      });

      expect(upsertResult).toBeDefined();
      expect(upsertResult.content[0].text).toContain("successfully upserted");

      // Retrieve and verify large document
      const getResult = await getHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID
      });

      const contentLines = getResult.content[0].text.split("\n");
      const contentStart = contentLines.findIndex(line => line.trim() === "Content:") + 1;
      const content = JSON.parse(contentLines.slice(contentStart).join("\n").trim());
      
      expect(content).toHaveProperty("data");
      expect(content.data.length).toBe(1024 * 1024);
    });
  });

  describe("Malformed Data Handling", () => {
    test("should handle malformed JSON responses", async () => {
      const upsertHandler = mockServer.registeredTools["upsert_document_by_id"].handler;
      
      // Test with malformed JSON
      const malformedJson = "{invalid: json}";
      
      await expect(upsertHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID,
        document_content: malformedJson
      })).rejects.toThrow();
    });

    test("should handle empty document content", async () => {
      const upsertHandler = mockServer.registeredTools["upsert_document_by_id"].handler;
      
      await expect(upsertHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID,
        document_content: ""
      })).rejects.toThrow();
    });
  });

  describe("Special Character Handling", () => {
    test("should handle documents with special characters", async () => {
      const upsertHandler = mockServer.registeredTools["upsert_document_by_id"].handler;
      const getHandler = mockServer.registeredTools["get_document_by_id"].handler;
      
      const specialCharsDoc = {
        text: "Special chars: !@#$%^&*()_+{}|:<>?",
        emoji: "🌟🎉✨",
        unicode: "你好世界",
        control: "\n\t\r"
      };

      // Upsert document with special characters
      await upsertHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID,
        document_content: JSON.stringify(specialCharsDoc)
      });

      // Retrieve and verify
      const result = await getHandler({
        scope_name: "_default",
        collection_name: "_default",
        document_id: TEST_DOC_ID
      });

      const contentLines = result.content[0].text.split("\n");
      const contentStart = contentLines.findIndex(line => line.trim() === "Content:") + 1;
      const content = JSON.parse(contentLines.slice(contentStart).join("\n").trim());
      
      expect(content).toEqual(specialCharsDoc);
    });
  });
}); 