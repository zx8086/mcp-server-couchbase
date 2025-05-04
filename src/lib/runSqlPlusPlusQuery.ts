// src/lib/runSqlPlusPlusQuery.ts

import { logger } from "../lib/logger";
import type { SQLPPParser } from "../types";

export async function runSqlPlusPlusQuery(ctx: any, scopeName: string, query: string, sqlppParser: SQLPPParser): Promise<any[]> {
    const bucket = ctx.lifespanContext.bucket;
    const readOnlyQueryMode = ctx.lifespanContext.readOnlyQueryMode;

    if (!bucket) {
        throw new Error("Bucket is not initialized");
    }

    logger.info(`Running SQL++ queries in read-only mode: ${readOnlyQueryMode}`);

    try {
        const scope = bucket.scope(scopeName);

        if (readOnlyQueryMode) {
            const parsedQuery = sqlppParser.parse(query);
            const dataModificationQuery = sqlppParser.modifiesData(parsedQuery);
            const structureModificationQuery = sqlppParser.modifiesStructure(parsedQuery);

            if (dataModificationQuery) {
                const errorMsg = "Data modification query is not allowed in read-only mode";
                logger.error(errorMsg);
                throw new Error(errorMsg);
            }
            if (structureModificationQuery) {
                const errorMsg = "Structure modification query is not allowed in read-only mode";
                logger.error(errorMsg);
                throw new Error(errorMsg);
            }
        }

        const result = await scope.query(
            query
        );
        const rows: any[] = [];
        for await (const row of result.rows) {
            rows.push(row);
        }
        return rows;
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Error running query: ${errorMsg}`);
        throw error;
    }
}