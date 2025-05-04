import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { capellaConn } from "../types";

const handler = async (ctx: any) => {
    const bucket = ctx.lifespanContext.bucket;

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
                    type: "text",
                    text: `Available scopes and collections in bucket:\n${JSON.stringify(scopesCollections, null, 2)}`
                }
            ]
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Error getting scopes and collections: ${errorMsg}`);
    }
};

export default (server: McpServer) => {
    server.tool(
        "get_scopes_and_collections_in_bucket",
        "Get the names of all scopes and collections in the bucket.",
        {},
        handler
    );
};

interface Collection {
    name: string;
}