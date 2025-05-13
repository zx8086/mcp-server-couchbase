/* src/resource/queryResource.ts */

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, createContextLogger } from "../lib/logger";
import type { Bucket } from "couchbase";
import { sqlppParser } from "../lib/sqlppParser";

const resourceLogger = createContextLogger("QueryResource");

export function registerQueryResource(server: McpServer, bucket: Bucket): void {
  server.resource(
    "query-results",
    new ResourceTemplate("query://{scope}/{encodedQuery}", { list: undefined }),
    async (uri, { scope, encodedQuery }) => {
      try {
        // Decode the query
        const query = decodeURIComponent(encodedQuery);

        resourceLogger.info("Executing query resource", { scope, query });

        try {
          const scopes = await bucket.collections().getAllScopes();
          const foundScope = scopes.find((s) => s.name === scope);
          if (!foundScope) {
            return {
              contents: [
                {
                  uri: uri.href,
                  type: "text/plain",
                  text: `Scope not found: ${scope}`,
                },
              ],
            };
          }

          // Execute the query (limit to select queries for safety)
          const upperQuery = query.trim().toUpperCase();
          if (!upperQuery.startsWith("SELECT")) {
            return {
              contents: [
                {
                  uri: uri.href,
                  type: "text/plain",
                  text: "Error: Only SELECT queries are allowed via the query resource",
                },
              ],
            };
          }

          // Add a LIMIT if not present to prevent accidental large result sets
          let safeQuery = query;
          if (!upperQuery.includes("LIMIT")) {
            safeQuery = `${query} LIMIT 100`;
          }

          // Check if this is a data or structure modification query
          const parsedQuery = sqlppParser.parse(safeQuery);
          if (
            sqlppParser.modifiesData(parsedQuery) ||
            sqlppParser.modifiesStructure(parsedQuery)
          ) {
            return {
              contents: [
                {
                  uri: uri.href,
                  type: "text/plain",
                  text: "Error: Modification queries are not allowed via the query resource",
                },
              ],
            };
          }

          const result = await bucket.scope(scope).query(safeQuery);
          const rows = await result.rows;

          return {
            contents: [
              {
                uri: uri.href,
                type: "application/json",
                text: JSON.stringify(rows, null, 2),
              },
            ],
          };
        } catch (queryError) {
          if (queryError instanceof Error) {
            return {
              contents: [
                {
                  uri: uri.href,
                  type: "text/plain",
                  text: `Query error: ${queryError.message}`,
                },
              ],
            };
          }
          throw queryError;
        }
      } catch (error) {
        resourceLogger.error("Error executing query resource", {
          error: error instanceof Error ? error.message : String(error),
          scope,
          encodedQuery,
        });

        return {
          contents: [
            {
              uri: uri.href,
              type: "text/plain",
              text: `Error executing query: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  resourceLogger.info("Query resource registered successfully");
}
