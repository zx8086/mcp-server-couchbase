import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runSqlPlusPlusQuery } from "../index";

const handler = async (ctx: any, params: any) => {
    const { scope_name, collection_name } = params || {};
    if (!scope_name || !collection_name) {
        throw new Error("Missing required parameters: scope_name or collection_name");
    }
    try {
        const query = `INFER ${collection_name}`;
        const result = await runSqlPlusPlusQuery(ctx, scope_name, query);
        return {
            content: [
                {
                    type: "text",
                    text: `Schema for collection "${collection_name}" in scope "${scope_name}":\n${JSON.stringify(result, null, 2)}`
                }
            ]
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Error getting schema: ${errorMsg}`);
    }
};

export default (server: McpServer) => {
    server.tool(
        "get_schema_for_collection",
        "Get the schema for a collection in the specified scope.",
        {
            scope_name: z.string().describe("Name of the scope"),
            collection_name: z.string().describe("Name of the collection")
        },
        handler
    );
};