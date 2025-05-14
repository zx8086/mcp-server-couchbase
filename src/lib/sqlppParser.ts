/* src/lib/sqlppParser.ts */

import type { SQLPPParser, ASTNode } from "../types";
import { logger } from "./logger";

export class SQLPPParserImpl implements SQLPPParser {
  private readonly dataModificationKeywords = new Set([
    "INSERT",
    "UPDATE",
    "DELETE",
    "UPSERT",
    "MERGE",
  ]);

  private readonly structureModificationKeywords = new Set([
    "CREATE",
    "DROP",
    "ALTER",
    "GRANT",
    "REVOKE",
  ]);

  parse(query: string): ASTNode {
    const cleanedQuery = this.removeComments(query).toUpperCase();
    logger.debug("Parsing SQL++ query", { queryLength: query.length });

    const firstKeyword = cleanedQuery.split(/\s+/)[0];
    logger.debug("Query analysis", { firstKeyword });

    return {
      type: "ROOT",
      rawQuery: cleanedQuery,
    };
  }

  modifiesData(parsedQuery: ASTNode): boolean {
    const query = parsedQuery.rawQuery ?? "";
    const result = Array.from(this.dataModificationKeywords).some(
      (keyword: string) => query.includes(keyword),
    );

    if (result) {
      logger.debug("Query identified as data modification query");
    }

    return result;
  }

  modifiesStructure(parsedQuery: ASTNode): boolean {
    const query = parsedQuery.rawQuery ?? "";
    const result = Array.from(this.structureModificationKeywords).some(
      (keyword: string) => query.includes(keyword),
    );

    if (result) {
      logger.debug("Query identified as structure modification query");
    }

    return result;
  }

  private removeComments(query: string): string {
    let cleaned = query.replace(/--.*$/gm, "");
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
    return cleaned.trim();
  }
}

export const sqlppParser = new SQLPPParserImpl();
