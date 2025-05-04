import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runSqlPlusPlusQuery } from "../lib/runSqlPlusPlusQuery";

const handler = async (ctx: any, params: any) => {
    const { scope_name, query } = params || {};
    if (!scope_name || !query) {
        throw new Error("Missing required parameters: scope_name or query");
    }
    try {
        const results = await runSqlPlusPlusQuery(ctx, scope_name, query);
        return {
            content: [
                {
                    type: "text",
                    text: `Query results from scope "${scope_name}":\n${JSON.stringify(results, null, 2)}`
                }
            ]
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Error running query: ${errorMsg}`);
    }
};

export default (server: McpServer) => {
    server.tool(
        "run_sql_plus_plus_query",
        "Run a SQL++ query on a scope and return the results.",
        {
            scope_name: z.string().describe("Name of the scope"),
            query: z.string().describe("SQL++ query to execute")
        },
        handler
    );
};