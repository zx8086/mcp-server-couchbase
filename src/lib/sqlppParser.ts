/* src/lib/sqlppParser.ts */

import type { SQLPPParser, ASTNode } from "../types";
import { createContextLogger } from "./logger";

const sqlLogger = createContextLogger('SQLParser');

/**
 * Simplified SQL++ Parser implementation
 */
export class SQLPPParserImpl implements SQLPPParser {
    private readonly dataModificationKeywords = new Set([
        'INSERT', 'UPDATE', 'DELETE', 'UPSERT', 'MERGE'
    ]);
    
    private readonly structureModificationKeywords = new Set([
        'CREATE', 'DROP', 'ALTER', 'GRANT', 'REVOKE'
    ]);
    
    parse(query: string): ASTNode {
        const cleanedQuery = this.removeComments(query).toUpperCase();
        sqlLogger.debug('Parsing SQL++ query', { queryLength: query.length });
        
        // Simple logging of first keyword for debugging
        const firstKeyword = cleanedQuery.split(/\s+/)[0];
        sqlLogger.debug('Query analysis', { firstKeyword });
        
        return { 
            type: 'ROOT',
            rawQuery: cleanedQuery
        };
    }
    
    modifiesData(parsedQuery: ASTNode): boolean {
        const query = parsedQuery.rawQuery ?? '';
        const result = Array.from(this.dataModificationKeywords).some((keyword: string) => 
            query.includes(keyword)
        );
        
        if (result) {
            sqlLogger.debug('Query identified as data modification query');
        }
        
        return result;
    }
    
    modifiesStructure(parsedQuery: ASTNode): boolean {
        const query = parsedQuery.rawQuery ?? '';
        const result = Array.from(this.structureModificationKeywords).some((keyword: string) => 
            query.includes(keyword)
        );
        
        if (result) {
            sqlLogger.debug('Query identified as structure modification query');
        }
        
        return result;
    }
    
    private removeComments(query: string): string {
        let cleaned = query.replace(/--.*$/gm, '');
        cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
        return cleaned.trim();
    }
}

// Create a singleton instance for use throughout the application
export const sqlppParser = new SQLPPParserImpl();