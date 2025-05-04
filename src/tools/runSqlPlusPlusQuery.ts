/* src/tools/runSqlPlusPlusQuery.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { QueryError, createError } from "../lib/errors";
import { logger } from "../lib/logger";
import { z } from "zod";

export default function runSqlPlusPlusQuery(server: McpServer, bucket: any): void {
    server.tool(
        "run_sql_plus_plus_query",
        "Run a SQL++ query on a specific scope",
        {
            scope_name: z.string().describe("Name of the scope"),
            query: z.string().describe("SQL++ query to execute")
        },
        async (args: { [x: string]: any }) => {
            const { scope_name, query } = args;
            try {
                const scope = bucket.scope(scope_name);
                const result = await scope.query(query);
                
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result.rows, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                throw createError('QUERY_ERROR', `Error executing SQL++ query`, {
                    error: error.message,
                    query,
                    scope: scope_name
                });
            }
        }
    );
}