/* src/tools/getDocumentById.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, createContextLogger } from "../lib/logger";
import type { Bucket } from "couchbase";
import { createError } from "../lib/errors";
import { z } from "zod"; 

const docLogger = createContextLogger("DocumentOps");

export default (server: McpServer, bucket: Bucket) => {
  server.tool(
    "get_document_by_id",
    "Get a document by ID from a specific scope and collection",
    {
      scope_name: z.string().describe("Name of the scope"),
      collection_name: z.string().describe("Name of the collection"),
      document_id: z.string().describe("ID of the document to retrieve"),
    },
    async ({ scope_name, collection_name, document_id }) => {
      try {
        docLogger.info("Processing document retrieval:", {
          scope_name,
          collection_name,
          document_id,
        });

        if (!bucket) {
          throw createError("DB_ERROR", "Bucket is not initialized");
        }

        const collection = bucket.scope(scope_name).collection(collection_name);
        const result = await collection.get(document_id);

        docLogger.info("Document retrieved successfully", {
          scope: scope_name,
          collection: collection_name,
          id: document_id,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.content, null, 2),
            },
          ],
        };
      } catch (error) {
        docLogger.error("Error in get_document_by_id:", error);
        throw error;
      }
    },
  );
};
