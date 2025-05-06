/* src/tools/getSchemaForCollection.ts */

import type { Bucket } from "couchbase";
import { z } from "zod";
import { createTool } from "./toolFactory";

const formatSchema = (doc: any): string => {
    let formattedText = "📋 Collection Schema:\n\n";
    
    const formatField = (key: string, value: any, indent: number = 0): string => {
        const padding = "  ".repeat(indent);
        const type = value === null ? "null" :
                    Array.isArray(value) ? "array" :
                    typeof value;
        
        let fieldText = `${padding}${key}: ${type}`;
        
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                if (value.length > 0) {
                    fieldText += `\n${padding}  Example: ${JSON.stringify(value)}`;
                }
            } else if (Object.keys(value).length > 0) {
                fieldText += "\n" + Object.entries(value)
                    .map(([k, v]) => formatField(k, v, indent + 1))
                    .join("\n");
            }
        } else if (value !== null) {
            fieldText += ` (Example: ${JSON.stringify(value)})`;
        }
        
        return fieldText;
    };
    
    formattedText += Object.entries(doc)
        .map(([key, value]) => formatField(key, value))
        .join("\n");
    
    return formattedText;
};

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
                text: "❌ No documents found in collection to infer schema"
            }]
        };
    }
    
    return {
        content: [{
            type: "text" as const,
            text: formatSchema(rows[0])
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