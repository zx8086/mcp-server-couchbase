/* src/tools/index.ts */

import getScopesAndCollections from './getScopesAndCollections';
import getSchemaForCollection from './getSchemaForCollection';
import runSqlPlusPlusQuery from './runSqlPlusPlusQuery';
import getDocumentById from './getDocumentById';
import upsertDocumentById from './upsertDocumentById';
import deleteDocumentById from './deleteDocumentById';
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Bucket } from "couchbase";

export type ToolFunction = (server: McpServer, bucket: Bucket) => void;

export const toolRegistry: Record<string, ToolFunction> = {
    get_scopes_and_collections: getScopesAndCollections,
    get_schema_for_collection: getSchemaForCollection,
    run_sql_plus_plus_query: runSqlPlusPlusQuery,
    get_document_by_id: getDocumentById,
    upsert_document_by_id: upsertDocumentById,
    delete_document_by_id: deleteDocumentById,
};

export default toolRegistry;