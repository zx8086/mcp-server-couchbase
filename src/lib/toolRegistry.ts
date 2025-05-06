import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import tools from "../tools";
import { logger } from "./logger";

export class ToolRegistry {
    static registerAll(server: McpServer, bucket: any): void {
        Object.entries(tools).forEach(([name, toolFn]) => {
            logger.info(`Registering tool: ${name}`);
            toolFn(server, bucket);
        });
    }
} 