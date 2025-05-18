/* src/tools/listPlaybooks.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger";
import type { Bucket } from "couchbase";
import { z } from "zod";
import { config } from "../config";

export default (server: McpServer, bucket: Bucket) => {
  server.tool(
    "list_playbooks",
    "List all available playbooks",
    {},
    async () => {
      try {
        logger.info("Listing available playbooks");
        
        // Use the server's readResourceByUri method to access the playbook directory
        try {
          const resourceResult = await (server as any).readResourceByUri("playbook://");
          
          if (!resourceResult || !resourceResult.contents || resourceResult.contents.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "No playbooks found"
                }
              ]
            };
          }
          
          return {
            content: resourceResult.contents.map(content => ({
              type: content.mimeType === "text/markdown" ? "text" : "text",
              text: content.text || "[Binary content]"
            }))
          };
        } catch (resourceError) {
          logger.error("Error reading playbook directory resource", { 
            error: resourceError instanceof Error ? resourceError.message : String(resourceError)
          });
          
          // If the resource approach fails, try to read the playbook directory directly
          const fs = require('fs/promises');
          const path = require('path');
          // Use config or env for playbookDir
          const playbookDir = process.env.PLAYBOOKS_BASE_DIR || (config.playbooks && config.playbooks.baseDirectory) || path.resolve(process.cwd(), "playbook");
          
          try {
            const files = await fs.readdir(playbookDir);
            const playbookFiles = files.filter(file => file.endsWith(".md"));
            
            if (playbookFiles.length === 0) {
              return {
                content: [
                  {
                    type: "text",
                    text: "No playbooks found in the playbook directory"
                  }
                ]
              };
            }
            
            let text = "# Available Playbooks\n\n";
            
            for (const file of playbookFiles) {
              const filePath = path.join(playbookDir, file);
              const fileContent = await fs.readFile(filePath, "utf-8");
              const firstLine = fileContent.split("\n")[0].replace(/^#\s*/, '');
              const description = firstLine || file;
              
              text += `- ${description} (${file})\n`;
            }
            
            return {
              content: [
                {
                  type: "text",
                  text
                }
              ]
            };
          } catch (fsError) {
            logger.error("Error reading playbook directory from filesystem", { 
              error: fsError instanceof Error ? fsError.message : String(fsError)
            });
            
            return {
              content: [
                {
                  type: "text",
                  text: `Error listing playbooks: ${resourceError instanceof Error ? resourceError.message : String(resourceError)}`
                }
              ]
            };
          }
        }
      } catch (error) {
        logger.error("Error in list_playbooks tool", { 
          error: error instanceof Error ? error.message : String(error)
        });
        
        return {
          content: [
            {
              type: "text",
              text: `Error listing playbooks: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
  
  server.tool(
    "get_playbook",
    "Get a specific playbook by ID",
    {
      playbook_id: z.string().describe("ID of the playbook to retrieve"),
    },
    async ({ playbook_id }) => {
      try {
        logger.info("Getting playbook", { playbook_id });
        
        const resourceUri = `playbook://${playbook_id}`;
        
        try {
          const resourceResult = await (server as any).readResourceByUri(resourceUri);
          
          if (!resourceResult || !resourceResult.contents || resourceResult.contents.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `Playbook not found: ${playbook_id}`
                }
              ]
            };
          }
          
          return {
            content: resourceResult.contents.map(content => ({
              type: content.mimeType === "text/markdown" ? "text" : "text",
              text: content.text || "[Binary content]"
            }))
          };
        } catch (resourceError) {
          logger.error("Error reading playbook resource", { 
            error: resourceError instanceof Error ? resourceError.message : String(resourceError),
            playbook_id,
            resourceUri
          });
          
          return {
            content: [
              {
                type: "text",
                text: `Error retrieving playbook: ${resourceError instanceof Error ? resourceError.message : String(resourceError)}`
              }
            ]
          };
        }
      } catch (error) {
        logger.error("Error in get_playbook tool", { 
          error: error instanceof Error ? error.message : String(error),
          playbook_id
        });
        
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving playbook: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
};