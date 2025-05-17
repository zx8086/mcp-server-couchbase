import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "../lib/logger";

export async function registerPlaybookResources(server: McpServer) {
  const playbookDir = path.resolve(__dirname, "../../docs/playbook");

  try {
    const files = await fs.readdir(playbookDir);
    const playbookFiles = files.filter(file => file.endsWith(".md"));

    for (const file of playbookFiles) {
      const uri = `playbook://${file}`;
      const filePath = path.join(playbookDir, file);
      const firstLine = await fs.readFile(filePath, "utf-8").then(content => content.split("\n")[0]);
      const description = firstLine || `Playbook resource for ${file}.`;

      logger.info("Registering playbook resource", { file, uri });

      server.resource(
        `playbook-${file}`,
        uri,
        async (uri: URL) => {
          try {
            const text = await fs.readFile(filePath, "utf-8");
            return {
              contents: [{
                uri: uri.href,
                mimeType: "text/markdown",
                text
              }]
            };
          } catch (err) {
            return {
              contents: [{
                uri: uri.href,
                mimeType: "text/plain",
                text: `Error reading playbook file: ${err instanceof Error ? err.message : String(err)}`
              }]
            };
          }
        }
      );
    }
  } catch (err) {
    logger.error("Error reading playbook directory", { error: err instanceof Error ? err.message : String(err) });
  }
} 