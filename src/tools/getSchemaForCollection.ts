/* src/tools/getSchemaForCollection.ts */

import type { Bucket } from "couchbase";
import { z } from "zod";
import { createTool } from "./toolFactory";

const getSchemaHandler = async (params: { scope: string; collection: string }, bucket: Bucket) => {
    const { scope, collection } = params;
    const scopeObj = bucket.scope(scope);
    
    // Get a sample document to infer schema
    const result = await scopeObj.query("SELECT * FROM `" + collection + "` LIMIT 1");
    const rows = await result.rows;
    
    if (rows.length === 0) {
        return {
            content: [{
                type: "text" as const,
                text: "No documents found in collection to infer schema"
            }]
        };
    }
    
    return {
        content: [{
            type: "text" as const,
            text: JSON.stringify(rows[0], null, 2)
        }]
    };
};

const paramSchema = z.object({
    scope: z.string().describe("Name of the scope"),
    collection: z.string().describe("Name of the collection")
});

export default createTool(
    "get_schema_for_collection",
    "Get the schema for a collection by sampling a document",
    paramSchema,
    getSchemaHandler
);