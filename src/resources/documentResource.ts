/* src/resources/documentResource.ts */

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, createContextLogger } from "../lib/logger";
import type { Bucket } from "couchbase";

const resourceLogger = createContextLogger("DocumentResource");

export function registerDocumentResource(
  server: McpServer,
  bucket: Bucket,
): void {
  server.resource(
    "document",
    new ResourceTemplate("document://{scope}/{collection}/{id}", {
      list: undefined,
    }),
    async (uri, { scope, collection, id }) => {
      try {
        resourceLogger.info("Fetching document resource", {
          scope,
          collection,
          id,
        });

        // Get the document
        try {
          const doc = await bucket.scope(scope).collection(collection).get(id);

          // Format as JSON
          return {
            contents: [
              {
                uri: uri.href,
                type: "application/json",
                text: JSON.stringify(doc.content, null, 2),
              },
            ],
          };
        } catch (docError) {
          if (
            docError instanceof Error &&
            docError.name === "DocumentNotFoundError"
          ) {
            return {
              contents: [
                {
                  uri: uri.href,
                  type: "text/plain",
                  text: `Document not found: ${scope}.${collection}.${id}`,
                },
              ],
            };
          } else if (
            docError instanceof Error &&
            docError.message.includes("scope not found")
          ) {
            return {
              contents: [
                {
                  uri: uri.href,
                  type: "text/plain",
                  text: `Scope not found: ${scope}`,
                },
              ],
            };
          } else if (
            docError instanceof Error &&
            docError.message.includes("collection not found")
          ) {
            return {
              contents: [
                {
                  uri: uri.href,
                  type: "text/plain",
                  text: `Collection not found: ${scope}.${collection}`,
                },
              ],
            };
          }
          throw docError;
        }
      } catch (error) {
        resourceLogger.error("Error fetching document resource", {
          error: error instanceof Error ? error.message : String(error),
          scope,
          collection,
          id,
        });

        return {
          contents: [
            {
              uri: uri.href,
              type: "text/plain",
              text: `Error fetching document: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  resourceLogger.info("Document resource registered successfully");
}
