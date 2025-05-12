/* src/tools/runSqlPlusPlusQuery.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger";
import { z } from "zod";
import type { Bucket } from "couchbase";
import { runSqlPlusPlusQuery } from "../lib/runSqlPlusPlusQuery";
import { sqlppParser } from "../lib/sqlppParser";
import { handleOperation } from "../lib/errorUtils";
import { createError } from "../lib/errors";

const runQuery = async (params: any, bucket: Bucket) => {
    if (!bucket) {
        throw createError('DB_ERROR', "Database error: bucket not found");
    }

    const { scope_name, query } = params;
    
    try {
        const rows = await runSqlPlusPlusQuery({ lifespanContext: { bucket } }, scope_name, query, sqlppParser);
        
        let formattedText = "";
        
        if (rows.length === 1 && 'distinct_source_count' in rows[0]) {
            formattedText = `Found ${rows[0].distinct_source_count} distinct sources`;
        } else {
            formattedText = `Query returned ${rows.length} rows:\n${JSON.stringify(rows, null, 2)}`;
        }
        
        return {
            content: [{ type: "text" as const, text: formattedText }]
        };
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('parsing failure')) {
                throw createError('DB_ERROR', "Database error: parsing failure");
            }
            if (error.message.includes('read-only mode')) {
                throw createError('DB_ERROR', "Database error: read-only mode");
            }
            if (error.message.includes('bucket not found')) {
                throw createError('DB_ERROR', "Database error: bucket not found");
            }
        }
        throw error;
    }
};

export default (server: McpServer, bucket: Bucket) => {
    server.tool(
        "run_sql_plus_plus_query",
        "Run a SQL++ query on a specific scope",
        {
            scope_name: z.string().describe("Name of the scope"),
            query: z.string().describe("SQL++ query to execute")
        },
        async (params: { scope_name: string; query: string }) => {
            if (!params || typeof params !== 'object') {
                throw new Error("Missing required arguments object");
            }
            return runQuery(params, bucket);
        }
    );
};