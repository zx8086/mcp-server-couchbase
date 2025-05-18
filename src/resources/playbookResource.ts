import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "../lib/logger";
import { config } from "../config";

/**
 * Register playbook resources from the playbook directory
 * Makes playbooks available via resources/list and resources/read endpoints
 */
export async function registerPlaybookResources(server: McpServer): Promise<void> {
  if (!config.playbooks?.enabled) {
    logger.info("Playbook resources are disabled in config");
    return;
  }
  try {
    // Try multiple possible locations for playbooks
    const possibleDirs = [
      config.playbooks?.baseDirectory,
      path.join(process.cwd(), "playbook"),
      path.join(__dirname, "../../playbook")
    ].filter((dir): dir is string => !!dir);

    logger.debug("Checking possible playbook directories", { possibleDirs });

    let playbookDir: string | null = null;
    let playbookFiles: string[] = [];

    for (const dir of possibleDirs) {
      try {
        await fs.access(dir);
        const files = await fs.readdir(dir);
        const mdFiles = files.filter(file => file.endsWith(config.playbooks.fileExtension || ".md"));
        if (mdFiles.length > 0) {
          playbookDir = dir;
          playbookFiles = mdFiles;
          logger.info(`Found playbooks in ${dir}`, { count: mdFiles.length });
          break;
        }
      } catch (err) {
        logger.debug(`Directory not accessible: ${dir}`, { 
          error: err instanceof Error ? err.message : String(err)
        });
        continue;
      }
    }

    if (!playbookDir) {
      logger.error("No playbook directory found with markdown files", { 
        checkedDirs: possibleDirs,
        currentDir: process.cwd()
      });
      // Create a stub directory and sample playbook if enabled
      if (config.playbooks?.enabled) {
        const defaultDir = config.playbooks.baseDirectory;
        logger.info(`Creating default playbook directory: ${defaultDir}`);
        try {
          await fs.mkdir(defaultDir, { recursive: true });
          await fs.writeFile(
            path.join(defaultDir, "sample-playbook.md"),
            "# Sample Playbook\n\nThis is a sample playbook created automatically."
          );
          playbookDir = defaultDir;
          playbookFiles = ["sample-playbook.md"];
        } catch (createErr) {
          logger.error("Failed to create sample playbook", { 
            error: createErr instanceof Error ? createErr.message : String(createErr),
            dir: defaultDir
          });
        }
      }
      if (!playbookDir) {
        return;
      }
    }

    logger.info(`Registering ${playbookFiles.length} playbooks from ${playbookDir}`);

    // Capture playbookDir in a closure for use in the template handler
    const playbookDirCopy = playbookDir;

    // Register the resource template for dynamic access FIRST (per MCP best practices)
    server.resource(
      "playbook-template",
      new ResourceTemplate("playbook://{playbookId}", { list: undefined }),
      async (uri, { playbookId }) => {
        try {
          const fileName = `${playbookId}${config.playbooks.fileExtension || ".md"}`;
          const filePath = path.join(playbookDirCopy!, fileName);
          logger.info("Attempting to read playbook file", { filePath, playbookId });
          const text = await fs.readFile(filePath, "utf-8");
          return {
            contents: [{
              uri: uri.href,
              mimeType: "text/markdown",
              text
            }]
          };
        } catch (err) {
          logger.error(`Error reading playbook file: ${playbookId}`, { error: err });
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

    // Register each playbook as a static resource
    for (const file of playbookFiles) {
      try {
        const filePath = path.join(playbookDir, file);
        const fileContent = await fs.readFile(filePath, "utf-8");
        const firstLine = fileContent.split("\n")[0]?.replace(/^#\s*/, '') || '';
        const description = firstLine || `Playbook: ${file}`;
        const resourceId = file.replace(/\.md$/, '');
        const resourceUri = `playbook://${resourceId}`;
        server.resource(
          `playbook-${resourceId}`,
          resourceUri,
          async (uri) => {
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
              logger.error(`Error reading playbook file: ${filePath}`, { error: err });
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
      } catch (err) {
        logger.error(`Error registering playbook: ${file}`, { 
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    // Register a directory resource to list all playbooks
    server.resource(
      "playbook-directory",
      "playbook://",
      async (uri) => {
        try {
          // Build resource descriptors for tools
          const resources = await Promise.all(playbookFiles.map(async file => {
            const resourceId = file.replace(/\.md$/, '');
            const filePath = path.join(playbookDir, file);
            let description = resourceId;
            try {
              const fileContent = await fs.readFile(filePath, "utf-8");
              const firstLine = fileContent.split("\n")[0]?.replace(/^#\s*/, '') || '';
              if (firstLine) description = firstLine;
            } catch {}
            return {
              uri: `playbook://${resourceId}`,
              name: description,
              description: `Playbook: ${description}`,
              mimeType: "text/markdown"
            };
          }));

          // Build markdown listing for human users
          let text = "# Available Playbooks\n\n";
          for (const res of resources) {
            text += `- [${res.name}](${res.uri})\n`;
          }

          return {
            contents: [{
              uri: uri.href,
              mimeType: "text/markdown",
              text
            }],
            resources
          };
        } catch (err) {
          logger.error("Error generating playbook directory", { error: err });
          return {
            contents: [{
              uri: uri.href,
              mimeType: "text/plain",
              text: `Error listing playbooks: ${err instanceof Error ? err.message : String(err)}`
            }],
            resources: []
          };
        }
      }
    );
    logger.info("Playbook resources registered successfully", { count: playbookFiles.length });
  } catch (err) {
    logger.error("Error registering playbook resources", { 
      error: err instanceof Error ? err.message : String(err)
    });
  }
} 