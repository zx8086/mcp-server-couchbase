/* src/tools/index.ts */

import getScopesAndCollections from './getScopesAndCollections';
import getSchemaForCollection from './getSchemaForCollection';
import documentOperations, { 
    getDocumentByIdHandler,
    upsertDocumentByIdHandler,
    deleteDocumentByIdHandler
} from './documentOperations';
import runSqlPlusPlusQuery from './runSqlPlusPlusQuery';
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Bucket } from "couchbase";

export type ToolFunction = (server: McpServer, bucket: Bucket) => void;

export const toolRegistry: Record<string, ToolFunction> = {
    get_scopes_and_collections: getScopesAndCollections,
    get_schema_for_collection: getSchemaForCollection,
    document_operations: documentOperations,
    run_sql_plus_plus_query: runSqlPlusPlusQuery
};

export {
    getDocumentByIdHandler,
    upsertDocumentByIdHandler,
    deleteDocumentByIdHandler
};

export default toolRegistry;