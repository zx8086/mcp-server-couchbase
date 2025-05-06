/* src/tools/getScopesAndCollections.ts */

import type { Bucket } from "couchbase";
import { z } from "zod";
import { createTool } from "./toolFactory";

const getScopesAndCollectionsHandler = async (_params: {}, bucket: Bucket) => {
    const scopes = await bucket.collections().getAllScopes();
    const scopesCollections: Record<string, string[]> = {};
    
    for (const scope of scopes) {
        scopesCollections[scope.name] = scope.collections.map(c => c.name);
    }
    
    return {
        content: [{
            type: "text" as const,
            text: JSON.stringify(scopesCollections, null, 2)
        }]
    };
};

export default createTool(
    "get_scopes_and_collections_in_bucket",
    "Get all scopes and collections in the bucket",
    z.object({}),
    getScopesAndCollectionsHandler
);

interface Collection {
    name: string;
}