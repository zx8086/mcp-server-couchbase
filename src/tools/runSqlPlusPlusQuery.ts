/* src/tools/runSqlPlusPlusQuery.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger";
import { z } from "zod";
import { withErrorHandling } from "../lib/errorUtils";
import type { Bucket } from "couchbase";

const runQuery = async (params: any, bucket: Bucket) => {
    const { scope_name, query } = params;
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
};

const runQueryHandler = withErrorHandling(runQuery, 'QUERY_ERROR', 'executing SQL++ query');

export default function runSqlPlusPlusQuery(server: McpServer, bucket: Bucket): void {
    server.tool(
        "run_sql_plus_plus_query",
        "Run a SQL++ query on a specific scope",
        {
            scope_name: z.string().describe("Name of the scope"),
            query: z.string().describe("SQL++ query to execute")
        },
        async (params: any) => runQueryHandler(params, bucket)
    );
}