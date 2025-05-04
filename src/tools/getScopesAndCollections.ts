/* src/tools/getScopesAndCollections.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DatabaseError, createError } from "../lib/errors";
import { logger } from "../lib/logger";
import { z } from "zod";
import type { Collection as CouchbaseCollection } from "couchbase";

export default function getScopesAndCollections(server: McpServer, bucket: any): void {
    server.tool(
        "get_scopes_and_collections_in_bucket",
        "Get all scopes and collections in the bucket",
        {},
        async () => {
            try {
                const scopes = await bucket.collections().getAllScopes();
                const result: { [key: string]: string[] } = {};
                
                for (const scope of scopes) {
                    const collections = scope.collections;
                    result[scope.name] = collections.map((col: CouchbaseCollection) => col.name);
                }
                
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                throw createError('DB_ERROR', `Error getting scopes and collections`, {
                    error: error.message
                });
            }
        }
    );
}

interface Collection {
    name: string;
}