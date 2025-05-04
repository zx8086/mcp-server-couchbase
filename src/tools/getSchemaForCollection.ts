/* src/tools/getSchemaForCollection.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger";
import { z } from "zod";
import { withErrorHandling } from "../lib/errorUtils";
import type { Bucket } from "couchbase";

const getSchema = async (params: any, bucket: Bucket) => {
    const { scope_name, collection_name } = params;
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
};

const getSchemaHandler = withErrorHandling(getSchema, 'DB_ERROR', 'getting schema for collection');

export default function getSchemaForCollection(server: McpServer, bucket: Bucket): void {
    server.tool(
        "get_schema_for_collection",
        "Get the schema for a specific collection in a scope",
        {
            scope_name: z.string().describe("Name of the scope"),
            collection_name: z.string().describe("Name of the collection")
        },
        async (params: any) => getSchemaHandler(params, bucket)
    );
}