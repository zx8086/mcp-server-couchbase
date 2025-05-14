/* src/lib/runSqlPlusPlusQuery.ts */

import type { OperationContext, QueryResult } from './types';
import { createError } from './errors';
import { logger } from './logger';
import type { SQLPPParser } from './sqlppParser';

export async function runSqlPlusPlusQuery(
  ctx: OperationContext,
  scopeName: string,
  query: string,
  sqlppParser: SQLPPParser
): Promise<QueryResult> {
  if (!ctx.lifespanContext.bucket) {
    logger.error('Bucket not initialized');
    throw createError('DB_ERROR', 'Bucket not initialized');
  }

  logger.info('Executing SQL++ query', {
    scope: scopeName,
    query
  });

  const parsedQuery = sqlppParser.parse(query);

  // Check for data modification queries in read-only mode
  if (sqlppParser.modifiesData(parsedQuery)) {
    logger.warn('Data modification query rejected in read-only mode', {
      query
    });
    throw createError('DB_ERROR', 'Data modification queries are not allowed in read-only mode');
  }

  // Check for structure modification queries in read-only mode
  if (sqlppParser.modifiesStructure(parsedQuery)) {
    logger.warn('Structure modification query rejected in read-only mode', {
      query
    });
    throw createError('DB_ERROR', 'Structure modification queries are not allowed in read-only mode');
  }

  try {
    logger.debug('Executing query', { query });
    const result = await ctx.lifespanContext.bucket.scope(scopeName).query(query);
    const rows = await result.rows;

    logger.info('Query executed successfully', {
      rowCount: rows.length
    });

    return {
      rows,
      meta: result.meta
    };
  } catch (error) {
    throw createError('QUERY_ERROR', 'Failed to execute query', error);
  }
}