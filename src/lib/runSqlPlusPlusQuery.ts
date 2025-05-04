// src/lib/runSqlPlusPlusQuery.ts

import { logger } from "../lib/logger";
import type { SQLPPParser } from "../types";
import { QueryError, createError } from "./errors";

export async function runSqlPlusPlusQuery(ctx: any, scopeName: string, query: string, sqlppParser: SQLPPParser): Promise<any[]> {
    const bucket = ctx.lifespanContext.bucket;
    const readOnlyQueryMode = ctx.lifespanContext.readOnlyQueryMode;

    if (!bucket) {
        throw createError('DB_ERROR', "Bucket is not initialized");
    }

    logger.info(`Running SQL++ queries in read-only mode: ${readOnlyQueryMode}`);

    try {
        const scope = bucket.scope(scopeName);

        if (readOnlyQueryMode) {
            const parsedQuery = sqlppParser.parse(query);
            const dataModificationQuery = sqlppParser.modifiesData(parsedQuery);
            const structureModificationQuery = sqlppParser.modifiesStructure(parsedQuery);

            if (dataModificationQuery) {
                throw createError('QUERY_ERROR', "Data modification query is not allowed in read-only mode", {
                    query,
                    scope: scopeName
                });
            }
            if (structureModificationQuery) {
                throw createError('QUERY_ERROR', "Structure modification query is not allowed in read-only mode", {
                    query,
                    scope: scopeName
                });
            }
        }

        const result = await scope.query(query);
        const rows: any[] = [];
        for await (const row of result.rows) {
            rows.push(row);
        }
        return rows;
    } catch (error: any) {
        throw createError('QUERY_ERROR', `Error running query: ${error.message}`, {
            error: error.message,
            query,
            scope: scopeName
        });
    }
}