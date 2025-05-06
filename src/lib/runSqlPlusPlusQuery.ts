/* src/lib/runSqlPlusPlusQuery.ts */

import { logger, createContextLogger } from "../lib/logger";
import type { SQLPPParser } from "../types";
import { createError } from "./errors";

const queryLogger = createContextLogger('QueryEngine');

export async function runSqlPlusPlusQuery(ctx: any, scopeName: string, query: string, sqlppParser: SQLPPParser): Promise<any[]> {
    const bucket = ctx.lifespanContext.bucket;
    const readOnlyQueryMode = ctx.lifespanContext.readOnlyQueryMode;

    if (!bucket) {
        queryLogger.error('Bucket not initialized');
        throw createError('DB_ERROR', "Bucket is not initialized");
    }

    queryLogger.info('Executing SQL++ query', { 
        readOnlyMode: readOnlyQueryMode,
        scope: scopeName,
        queryType: 'SQL++'
    });

    try {
        const scope = bucket.scope(scopeName);

        if (readOnlyQueryMode) {
            const parsedQuery = sqlppParser.parse(query);
            const dataModificationQuery = sqlppParser.modifiesData(parsedQuery);
            const structureModificationQuery = sqlppParser.modifiesStructure(parsedQuery);

            if (dataModificationQuery) {
                queryLogger.warn('Data modification query rejected in read-only mode', {
                    query,
                    scope: scopeName
                });
                throw createError('QUERY_ERROR', "Data modification query is not allowed in read-only mode", {
                    query,
                    scope: scopeName
                });
            }
            if (structureModificationQuery) {
                queryLogger.warn('Structure modification query rejected in read-only mode', {
                    query,
                    scope: scopeName
                });
                throw createError('QUERY_ERROR', "Structure modification query is not allowed in read-only mode", {
                    query,
                    scope: scopeName
                });
            }
        }

        queryLogger.debug('Executing query', { query });
        const result = await scope.query(query);
        const rows: any[] = [];
        for await (const row of result.rows) {
            rows.push(row);
        }
        queryLogger.info('Query executed successfully', {
            rowCount: rows.length,
            scope: scopeName
        });
        return rows;
    } catch (error: any) {
        queryLogger.error('Query execution failed', {
            error: error.message,
            query,
            scope: scopeName
        });
        throw createError('QUERY_ERROR', `Error running query: ${error.message}`, {
            error: error.message,
            query,
            scope: scopeName
        });
    }
}