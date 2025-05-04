import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Bucket } from "couchbase";

export const runSqlPlusPlusQueryHandler = async (params: any, bucket: Bucket) => {
    const { scope_name, query } = params || {};
    if (!scope_name || !query) {
        throw new Error("Missing required parameters: scope_name or query");
    }
    try {
        const scope = bucket.scope(scope_name);
        const result = await scope.query(query);
        const rows: any[] = [];
        for await (const row of result.rows) {
            rows.push(row);
        }
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Query results from scope \"${scope_name}\":\n${JSON.stringify(rows, null, 2)}`
                }
            ]
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Error running query: ${errorMsg}`);
    }
};

export default (server: McpServer, bucket: Bucket) => {
    server.tool(
        "run_sql_plus_plus_query",
        "Run a SQL++ query on a scope and return the results.",
        {
            scope_name: z.string().describe("Name of the scope"),
            query: z.string().describe("SQL++ query to execute")
        },
        async (params: any) => runSqlPlusPlusQueryHandler(params, bucket)
    );
};