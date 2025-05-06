/* src/tools/runSqlPlusPlusQuery.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger";
import { z } from "zod";
import { withErrorHandling } from "./toolFactory";
import type { Bucket } from "couchbase";

const runQuery = async (params: any, bucket: Bucket) => {
    const { scope_name, query } = params;
    const scope = bucket.scope(scope_name);
    const result = await scope.query(query);
    
    // Extract and convert rows to array
    const rows = [];
    for await (const row of result.rows) {
        rows.push(row);
    }
    
    // Format the response based on query type
    let formattedText = "";
    
    // Special handling for COUNT DISTINCT query
    if (rows.length === 1 && 'distinct_source_count' in rows[0]) {
        formattedText = `Count of distinct "unique_source" values: ${rows[0].distinct_source_count}`;
    } else if (rows.length > 0) {
        // Format other query results
        const keys = Object.keys(rows[0]);
        formattedText = "Query Results:\n\n";
        
        // Add table headers
        formattedText += keys.join(" | ") + "\n";
        formattedText += keys.map(() => "---").join(" | ") + "\n";
        
        // Add rows
        rows.forEach(row => {
            formattedText += keys.map(key => {
                const value = row[key];
                return typeof value === 'object' ? JSON.stringify(value) : String(value);
            }).join(" | ") + "\n";
        });
        
        formattedText += `\n${rows.length} rows returned`;
    } else {
        formattedText = "Query executed successfully but returned no results.";
    }
    
    return {
        content: [
            {
                type: "text",
                text: formattedText
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