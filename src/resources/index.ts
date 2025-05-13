/* src/resources/index.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Bucket } from "couchbase";
import { registerDatabaseStructureResource } from "./databaseStructureResource";
import { registerSchemaResource } from "./schemaResource";
import { registerDocumentResource } from "./documentResource";
import { registerQueryResource } from "./queryResource";

export function registerAllResources(server: McpServer, bucket: Bucket): void {
  // Register all Couchbase resources
  registerDatabaseStructureResource(server, bucket);
  registerSchemaResource(server, bucket);
  registerDocumentResource(server, bucket);
  registerQueryResource(server, bucket);
}
