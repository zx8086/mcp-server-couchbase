/* src/tools/runSqlPlusPlusQuery.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger";
import { z } from "zod";
import type { Bucket } from "couchbase";
import { runSqlPlusPlusQuery } from "../lib/runSqlPlusPlusQuery";
import { sqlppParser } from "../lib/sqlppParser";
import { createError } from "../lib/errors";
import { ResponseBuilder } from "../lib/responseBuilder";

const runQuery = async (params: { scope_name: string; query: string }, bucket: Bucket) => {
    if (!bucket) {
        return {
            content: [{ type: "text" as const, text: "Database error: bucket not found" }],
            isError: true
        };
    }

    const { scope_name, query } = params;

    try {
        const result = await runSqlPlusPlusQuery({ lifespanContext: { bucket } }, scope_name, query, sqlppParser);
        const rows = result.rows as any[];

        if (rows.length === 1 && 'distinct_source_count' in rows[0]) {
            return {
                content: [{ type: "text" as const, text: `Found ${rows[0].distinct_source_count} distinct sources` }],
                _meta: { rowCount: 1 },
                isError: false
            };
        }

        return {
            content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
            _meta: { rowCount: rows.length, meta: result.meta },
            isError: false
        };
    } catch (error) {
        logger.error("Failed to execute query", { error });
        return {
            content: [{ type: "text" as const, text: "Failed to execute query" }],
            isError: true
        };
    }
};

export default (server: McpServer, bucket: Bucket) => {
    server.tool(
        "run_sql_plus_plus_query",
        {
            scope_name: z.string().describe("Name of the scope"),
            query: z.string().describe("SQL++ query to execute")
        },
        async (params, extra) => {
            return runQuery(params, bucket);
        }
    );
};