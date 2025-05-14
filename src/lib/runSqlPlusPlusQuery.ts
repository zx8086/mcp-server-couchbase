/* src/lib/runSqlPlusPlusQuery.ts */

import { logger } from "../lib/logger";
import type { SQLPPParser } from "../types";
import { createError } from "./errors";
import { handleOperation } from "./errorUtils";

export async function runSqlPlusPlusQuery(ctx: any, scopeName: string, query: string, sqlppParser: SQLPPParser): Promise<any[]> {
    return handleOperation(
        async () => {
            const bucket = ctx.lifespanContext.bucket;
            const readOnlyQueryMode = ctx.lifespanContext.readOnlyQueryMode;

            if (!bucket) {
                logger.error('Bucket not initialized');
                throw createError('DB_ERROR', "Bucket is not initialized");
            }

            logger.info('Executing SQL++ query', { 
                readOnlyMode: readOnlyQueryMode,
                scope: scopeName,
                queryType: 'SQL++'
            });

            const scope = bucket.scope(scopeName);

            if (readOnlyQueryMode) {
                const parsedQuery = sqlppParser.parse(query);
                const dataModificationQuery = sqlppParser.modifiesData(parsedQuery);
                const structureModificationQuery = sqlppParser.modifiesStructure(parsedQuery);

                if (dataModificationQuery) {
                    logger.warn('Data modification query rejected in read-only mode', {
                        query,
                        scope: scopeName
                    });
                    throw createError('QUERY_ERROR', "Data modification query is not allowed in read-only mode", {
                        query,
                        scope: scopeName
                    });
                }
                if (structureModificationQuery) {
                    logger.warn('Structure modification query rejected in read-only mode', {
                        query,
                        scope: scopeName
                    });
                    throw createError('QUERY_ERROR', "Structure modification query is not allowed in read-only mode", {
                        query,
                        scope: scopeName
                    });
                }
            }

            logger.debug('Executing query', { query });
            const result = await scope.query(query);
            const rows: any[] = [];
            for await (const row of result.rows) {
                rows.push(row);
            }
            logger.info('Query executed successfully', {
                rowCount: rows.length,
                scope: scopeName
            });
            return rows;
        },
        'QUERY_ERROR',
        'executing SQL++ query',
        { scope: scopeName, query }
    );
}