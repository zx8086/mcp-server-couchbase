import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Bucket } from "couchbase";

export const getScopesAndCollectionsHandler = async (_params: any, bucket: Bucket) => {
    if (!bucket) {
        throw new Error("Bucket is not initialized");
    }
    try {
        const scopesCollections: Record<string, string[]> = {};
        const collectionManager = bucket.collections();
        const scopes = await collectionManager.getAllScopes();
        for (const scope of scopes) {
            const collectionNames = scope.collections.map((c: Collection) => c.name);
            scopesCollections[scope.name] = collectionNames;
        }
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Available scopes and collections in bucket:\n${JSON.stringify(scopesCollections, null, 2)}`
                }
            ]
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Error getting scopes and collections: ${errorMsg}`);
    }
};

export default (server: McpServer, bucket: Bucket) => {
    server.tool(
        "get_scopes_and_collections_in_bucket",
        "Get the names of all scopes and collections in the bucket.",
        {},
        async (_params: any) => getScopesAndCollectionsHandler(_params, bucket)
    );
};

interface Collection {
    name: string;
}