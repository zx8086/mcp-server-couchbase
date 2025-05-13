/* src/resources/schemaResource.ts */

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, createContextLogger } from "../lib/logger";
import type { Bucket } from "couchbase";

const resourceLogger = createContextLogger("SchemaResource");

export function registerSchemaResource(
  server: McpServer,
  bucket: Bucket,
): void {
  server.resource(
    "collection-schema",
    new ResourceTemplate("schema://{scope}/{collection}", { list: undefined }),
    async (uri, { scope, collection }) => {
      try {
        resourceLogger.info("Fetching schema resource", { scope, collection });

        const collectionMgr = bucket.collections();
        const scopes = await collectionMgr.getAllScopes();
        const foundScope = scopes.find((s) => s.name === scope);

        if (!foundScope) {
          return {
            contents: [
              {
                uri: uri.href,
                type: "text/plain",
                text: `Error: Scope "${scope}" not found`,
              },
            ],
          };
        }

        const foundCollection = foundScope.collections.find(
          (c) => c.name === collection,
        );
        if (!foundCollection) {
          return {
            contents: [
              {
                uri: uri.href,
                type: "text/plain",
                text: `Error: Collection "${collection}" not found in scope "${scope}"`,
              },
            ],
          };
        }

        try {
          const result = await bucket
            .scope(scope)
            .query(
              `SELECT RAW META().id FROM \`${bucket.name}\`.\`${scope}\`.\`${collection}\` LIMIT 1`,
            );

          const rows = await result.rows;

          if (rows && rows.length > 0) {
            const docId = rows[0];
            const docResult = await bucket
              .scope(scope)
              .collection(collection)
              .get(docId);

            // Format as a markdown schema
            let schemaText = `# Schema for ${scope}.${collection}\n\n`;
            schemaText += formatDocumentAsSchema(docResult.content);

            return {
              contents: [
                {
                  uri: uri.href,
                  type: "text/markdown",
                  text: schemaText,
                },
              ],
            };
          } else {
            return {
              contents: [
                {
                  uri: uri.href,
                  type: "text/plain",
                  text: `No documents found in ${scope}.${collection} to infer schema.`,
                },
              ],
            };
          }
        } catch (queryError) {
          // Handle the case where no primary index exists
          if (
            queryError instanceof Error &&
            queryError.message.includes("index")
          ) {
            return {
              contents: [
                {
                  uri: uri.href,
                  type: "text/plain",
                  text: `Error: Unable to query collection. You may need to create a primary index:\nCREATE PRIMARY INDEX ON \`${bucket.name}\`.\`${scope}\`.\`${collection}\`;`,
                },
              ],
            };
          }
          throw queryError;
        }
      } catch (error) {
        resourceLogger.error("Error fetching schema resource", {
          error: error instanceof Error ? error.message : String(error),
          scope,
          collection,
        });

        return {
          contents: [
            {
              uri: uri.href,
              type: "text/plain",
              text: `Error fetching schema: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  resourceLogger.info("Schema resource registered successfully");
}

/**
 * Format a document as a schema description in Markdown
 */
function formatDocumentAsSchema(doc: any): string {
  let schemaText = "";

  const formatField = (key: string, value: any, level: number = 0): string => {
    const indent = "  ".repeat(level);
    const type =
      value === null ? "null" : Array.isArray(value) ? "array" : typeof value;

    let fieldText = `${indent}- **${key}**: ${type}`;

    if (type === "object" && value !== null && !Array.isArray(value)) {
      fieldText += "\n";
      for (const [k, v] of Object.entries(value)) {
        fieldText += formatField(k, v, level + 1);
      }
    } else if (type === "array" && value.length > 0) {
      const firstItem = value[0];
      const itemType = typeof firstItem;

      if (itemType === "object" && firstItem !== null) {
        fieldText += ` of objects\n`;
        // Format first array item as example
        for (const [k, v] of Object.entries(firstItem)) {
          fieldText += formatField(`${key}[0].${k}`, v, level + 1);
        }
      } else {
        fieldText += ` of ${itemType}s\n`;
      }
    } else {
      fieldText += "\n";
    }

    return fieldText;
  };

  for (const [key, value] of Object.entries(doc)) {
    schemaText += formatField(key, value);
  }

  return schemaText;
}
