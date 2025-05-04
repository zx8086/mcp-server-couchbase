import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DatabaseError, createError } from "../lib/errors";
import { logger } from "../lib/logger";
import { z } from "zod";

export default function getSchemaForCollection(server: McpServer, bucket: any): void {
    server.tool(
        "get_schema_for_collection",
        "Get the schema for a specific collection in a scope",
        {
            scope_name: z.string().describe("Name of the scope"),
            collection_name: z.string().describe("Name of the collection")
        },
        async (args: { [x: string]: any }) => {
            const { scope_name, collection_name } = args;
            try {
                const scope = bucket.scope(scope_name);
                const result = await scope.query(`SELECT * FROM \`${collection_name}\` LIMIT 1`);
                
                if (result.rows.length === 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "No documents found in collection to infer schema"
                            }
                        ]
                    };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result.rows[0], null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                throw createError('DB_ERROR', `Error getting schema for collection ${collection_name}`, {
                    error: error.message,
                    collection: collection_name,
                    scope: scope_name
                });
            }
        }
    );
}