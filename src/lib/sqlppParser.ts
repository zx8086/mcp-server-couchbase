/* src/lib/sqlppParser.ts */

import type { SQLPPParser, ASTNode } from "../types";

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
        return { 
            type: 'ROOT',
            rawQuery: cleanedQuery
        };
    }
    
    modifiesData(parsedQuery: ASTNode): boolean {
        const query = parsedQuery.rawQuery ?? '';
        return Array.from(this.dataModificationKeywords).some((keyword: string) => 
            query.includes(keyword)
        );
    }
    
    modifiesStructure(parsedQuery: ASTNode): boolean {
        const query = parsedQuery.rawQuery ?? '';
        return Array.from(this.structureModificationKeywords).some((keyword: string) => 
            query.includes(keyword)
        );
    }
    
    private removeComments(query: string): string {
        let cleaned = query.replace(/--.*$/gm, '');
        cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
        return cleaned.trim();
    }
}

// Create a singleton instance for use throughout the application
export const sqlppParser = new SQLPPParserImpl();