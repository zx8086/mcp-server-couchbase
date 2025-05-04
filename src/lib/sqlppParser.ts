/* src/lib/sqlppParser.ts */

import type { SQLPPParser, ASTNode } from "../types";

/**
 * Robust SQL++ Parser implementation
 */
export class SQLPPParserImpl implements SQLPPParser {
    private readonly dataModificationKeywords = new Set([
        'INSERT', 'UPDATE', 'DELETE', 'UPSERT', 'MERGE'
    ]);
    private readonly structureModificationKeywords = new Set([
        'CREATE', 'DROP', 'ALTER', 'GRANT', 'REVOKE'
    ]);
    parse(query: string): ASTNode {
        const cleanedQuery = this.removeComments(query);
        const tokens = this.tokenize(cleanedQuery);
        return this.buildAST(tokens);
    }
    private removeComments(query: string): string {
        let cleaned = query.replace(/--.*$/gm, '');
        cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
        return cleaned.trim();
    }
    private tokenize(query: string): string[] {
        const tokens: string[] = [];
        let currentToken = '';
        let inString = false;
        let stringDelimiter = '';
        for (let i = 0; i < query.length; i++) {
            const char = query[i] as string;
            if (inString) {
                currentToken += char;
                if (char === stringDelimiter && query[i - 1] !== '\\') {
                    inString = false;
                    tokens.push(currentToken);
                    currentToken = '';
                }
            } else {
                if (char === '"' || char === "'") {
                    inString = true;
                    stringDelimiter = char;
                    currentToken += char;
                } else if (/\s/.test(char)) {
                    if (currentToken) {
                        tokens.push(currentToken);
                        currentToken = '';
                    }
                } else {
                    currentToken += char;
                }
            }
        }
        if (currentToken) {
            tokens.push(currentToken);
        }
        return tokens;
    }
    private buildAST(tokens: string[]): ASTNode {
        const root: ASTNode = { type: 'ROOT', children: [] };
        let currentNode = root;
        let currentStatement: ASTNode | null = null;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i]?.toUpperCase() ?? '';
            if (this.isStatementStart(token)) {
                if (currentStatement) {
                    if (currentNode.children) {
                        currentNode.children.push(currentStatement);
                    }
                }
                currentStatement = { type: token, children: [] };
            } else if (currentStatement) {
                if (currentStatement.children) {
                    currentStatement.children.push({ type: 'TOKEN', value: tokens[i] });
                }
            }
        }
        if (currentStatement && currentNode.children) {
            currentNode.children.push(currentStatement);
        }
        return root;
    }
    private isStatementStart(token: string): boolean {
        return this.dataModificationKeywords.has(token) ||
            this.structureModificationKeywords.has(token) ||
            token === 'SELECT';
    }
    modifiesData(parsedQuery: ASTNode): boolean {
        if (!parsedQuery.children) return false;
        return parsedQuery.children.some(child =>
            this.dataModificationKeywords.has(child.type)
        );
    }
    modifiesStructure(parsedQuery: ASTNode): boolean {
        if (!parsedQuery.children) return false;
        return parsedQuery.children.some(child =>
            this.structureModificationKeywords.has(child.type)
        );
    }
}

// Create a singleton instance for use throughout the application
export const sqlppParser = new SQLPPParserImpl();