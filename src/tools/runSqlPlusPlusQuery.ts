/* src/tools/runSqlPlusPlusQuery.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger";
import { z } from "zod";
import type { Bucket } from "couchbase";
import { runSqlPlusPlusQuery } from "../lib/runSqlPlusPlusQuery";
import { sqlppParser } from "../lib/sqlppParser";
import { createError } from "../lib/errors";
import { ResponseBuilder } from "../lib/responseBuilder";

interface SqlQueryParams {
    scope_name: string;
    query: string;
}

const runQuery = async (params: SqlQueryParams, bucket: Bucket): Promise<{ content: Array<{ type: string; text: string }> }> => {
    if (!bucket) {
        throw createError("DB_ERROR", "Database error: bucket not found");
    }

    const { scope_name, query } = params;
    
    try {
        const result = await runSqlPlusPlusQuery({ lifespanContext: { bucket } }, scope_name, query, sqlppParser);
        
        if (result.rows.length === 1 && 'distinct_source_count' in result.rows[0]) {
            return ResponseBuilder
                .success(`Found ${result.rows[0].distinct_source_count} distinct sources`, "text")
                .setMetadata({ rowCount: 1 })
                .build();
        }

        return ResponseBuilder
            .success(result.rows, "json")
            .setMetadata({ 
                rowCount: result.rows.length,
                meta: result.meta 
            })
            .build();
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('parsing failure')) {
                throw createError("QUERY_ERROR", "Query parsing failed", error);
            }
            if (error.message.includes('read-only mode')) {
                throw createError("QUERY_ERROR", "Operation not allowed in read-only mode", error);
            }
            if (error.message.includes('bucket not found')) {
                throw createError("DB_ERROR", "Bucket not found", error);
            }
        }
        throw createError("QUERY_ERROR", "Failed to execute query", error);
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
                throw createError("VALIDATION_ERROR", "Missing required arguments object");
            }
            return runQuery(params, bucket);
        }
    );
};