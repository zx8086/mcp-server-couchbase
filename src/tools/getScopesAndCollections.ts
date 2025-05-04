/* src/tools/getScopesAndCollections.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger";
import { z } from "zod";
import type { CollectionSpec } from "couchbase";
import { withErrorHandling } from "../lib/errorUtils";
import type { Bucket } from "couchbase";

const getScopesAndCollections = async (_params: any, bucket: Bucket) => {
    const scopes = await bucket.collections().getAllScopes();
    const result: { [key: string]: string[] } = {};
    
    for (const scope of scopes) {
        const collections = scope.collections;
        result[scope.name] = collections.map((col: CollectionSpec) => col.name);
    }
    
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(result, null, 2)
            }
        ]
    };
};

const getScopesAndCollectionsHandler = withErrorHandling(getScopesAndCollections, 'DB_ERROR', 'getting scopes and collections');

export default function getScopesAndCollectionsTool(server: McpServer, bucket: Bucket): void {
    server.tool(
        "get_scopes_and_collections_in_bucket",
        "Get all scopes and collections in the bucket",
        {},
        async (params: any) => getScopesAndCollectionsHandler(params, bucket)
    );
}

interface Collection {
    name: string;
}