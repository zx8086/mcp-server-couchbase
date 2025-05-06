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
    
    // Format the response as human-readable text
    let formattedText = "Here are all the scopes and collections in the bucket:\n\n";
    
    Object.entries(scopesCollections).forEach(([scope, collections]) => {
        formattedText += `📁 Scope: ${scope}\n`;
        if (collections && collections.length > 0) {
            collections.forEach(collection => {
                formattedText += `  └─ 📄 Collection: ${collection}\n`;
            });
        } else {
            formattedText += '  └─ (No collections)\n';
        }
        formattedText += '\n';
    });
    
    return {
        content: [{
            type: "text" as const,
            text: formattedText
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