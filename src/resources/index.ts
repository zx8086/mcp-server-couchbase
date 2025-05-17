/* src/resources/index.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Bucket } from "couchbase";
import { registerDatabaseStructureResource } from "./databaseStructureResource";
import { registerSchemaResource } from "./schemaResource";
import { registerDocumentResource } from "./documentResource";
import { registerQueryResource } from "./queryResource";
import { registerMarkdownDocumentationResource } from "./documentationResource";
import { registerPlaybookResources } from "./playbookResource";
import { config } from "../config";

export async function registerAllResources(server: McpServer, bucket: Bucket): Promise<void> {
  registerDatabaseStructureResource(server, bucket);
  registerSchemaResource(server, bucket);
  registerDocumentResource(server, bucket);
  registerQueryResource(server, bucket);
  
  // Register the markdown documentation resource if configured
  if (config.documentation?.enabled) {
    registerMarkdownDocumentationResource(server, bucket, {
      baseDirectory: config.documentation.baseDirectory || './docs',
      fileExtension: config.documentation.fileExtension || '.md'
    });
  }

  // Register static playbook resources
  await registerPlaybookResources(server);
}
