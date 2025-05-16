/* src/tools/listDocumentation.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger";
import type { Bucket } from "couchbase";
import { createError } from "../lib/errors";
import { z } from "zod";
import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from "../config";

// Function to sanitize file paths to prevent directory traversal
const sanitizePath = (inputPath: string): string => {
  return path.normalize(inputPath)
    .replace(/^(\.\.(\/|\\|$))+/, '');
};

export default (server: McpServer, bucket: Bucket) => {
  server.tool(
    "list_documentation",
    "List available documentation resources",
    {
      scope_name: z.string().optional().describe("Name of the scope to list documentation for"),
      collection_name: z.string().optional().describe("Name of the collection to list documentation for"),
    },
    async ({ scope_name, collection_name }) => {
      if (!config.documentation?.enabled) {
        return {
          content: [
            { type: "text", text: "Documentation tools are disabled in the server configuration." }
          ]
        };
      }
      // Always define baseDirectory here
      const baseDirectory = config.documentation.baseDirectory || './docs';
      try {
        logger.info("Listing documentation", {
          scope: scope_name,
          collection: collection_name
        });

        let content = "# Available Documentation\n\n";
        let currentPath = baseDirectory;

        if (scope_name) {
          currentPath = path.join(currentPath, sanitizePath(scope_name));
          content += `## Scope: ${scope_name}\n\n`;

          if (collection_name) {
            currentPath = path.join(currentPath, sanitizePath(collection_name));
            content += `### Collection: ${collection_name}\n\n`;
            
            try {
              const files = await fs.readdir(currentPath);
              const docFiles = files.filter(file => file.endsWith(config.documentation?.fileExtension || '.md'));
              
              if (docFiles.length === 0) {
                content += "No documentation files found in this collection.\n";
              } else {
                content += "Available documentation files:\n\n";
                for (const file of docFiles) {
                  const fileName = file.replace(config.documentation?.fileExtension || '.md', '');
                  content += `- [${fileName}](docs://${scope_name}/${collection_name}/${fileName})\n`;
                }
              }
            } catch (error) {
              content += "No documentation found for this collection.\n";
            }
          } else {
            try {
              const collections = await fs.readdir(currentPath);
              if (collections.length === 0) {
                content += "No collections found in this scope.\n";
              } else {
                content += "Available collections:\n\n";
                for (const collection of collections) {
                  content += `- [${collection}](docs://${scope_name}/${collection})\n`;
                }
              }
            } catch (error) {
              content += "No documentation found for this scope.\n";
            }
          }
        } else {
          try {
            const scopes = await fs.readdir(currentPath);
            if (scopes.length === 0) {
              content += "No documentation found.\n";
            } else {
              content += "Available scopes:\n\n";
              for (const scope of scopes) {
                content += `- [${scope}](docs://${scope})\n`;
              }
            }
          } catch (error) {
            content += "No documentation found.\n";
          }
        }

        return {
          content: [
            {
              type: "text",
              text: content
            }
          ]
        };
      } catch (error) {
        logger.error("Error listing documentation", {
          error: error instanceof Error ? error.message : String(error),
          scope: scope_name,
          collection: collection_name
        });
        throw error;
      }
    }
  );
}; 