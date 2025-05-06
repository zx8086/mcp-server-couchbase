/* tests/server.test.ts */

import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach, mock } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { capellaConn } from "../src/types";
import { startServer } from "../src/index";
import { logger } from "../src/lib/logger";

describe("Server Initialization Tests", () => {
    let mockMcpServer: { connect: ReturnType<typeof mock>; tool: ReturnType<typeof mock> };
    let mockConnection: capellaConn;

    beforeEach(() => {
        // Create mock connection
        mockConnection = {
            cluster: {},
            bucket: () => ({}),
            scope: () => ({}),
            collection: () => ({}),
            defaultBucket: {},
            defaultScope: {},
            defaultCollection: {},
            CouchbaseError: Error
        } as unknown as capellaConn;

        // Mock connection manager
        mock.module("../src/lib/connectionManager", () => ({
            CouchbaseConnectionManager: {
                getConnection: async () => mockConnection
            }
        }));

        mockMcpServer = {
            connect: mock(async () => {}),
            tool: mock(() => {})
        };

        // Mock transport constructors
        mock.module("@modelcontextprotocol/sdk/server/stdio.js", () => ({
            StdioServerTransport: mock(() => ({
                start: async () => {},
                connect: async () => {},
                close: async () => {}
            }))
        }));

        mock.module("@modelcontextprotocol/sdk/server/sse.js", () => ({
            SSEServerTransport: mock((port: number) => ({
                port,
                start: async () => {},
                connect: async () => {},
                close: async () => {}
            }))
        }));

        // Mock McpServer constructor
        mock.module("@modelcontextprotocol/sdk/server/mcp.js", () => ({
            McpServer: mock(() => mockMcpServer)
        }));
    });

    test("should register tools with server", async () => {
        await startServer({
            transport: 'stdio'
        });

        // Verify that tools were registered
        expect(mockMcpServer.tool).toHaveBeenCalled();
    });

    test("should initialize server with stdio transport", async () => {
        await startServer({
            transport: 'stdio'
        });

        expect(mockMcpServer.connect).toHaveBeenCalled();
    });

    test("should initialize server with sse transport", async () => {
        const port = 3000;
        await startServer({
            transport: 'sse',
            port
        });

        expect(mockMcpServer.connect).toHaveBeenCalled();
        const transportArg = mockMcpServer.connect.mock.calls[0][0];
        expect(transportArg.port).toBe(port);
    });

    test("should use default port for sse transport when not specified", async () => {
        await startServer({
            transport: 'sse'
        });

        const transportArg = mockMcpServer.connect.mock.calls[0][0];
        expect(transportArg.port).toBe(8080);
    });

    test("should handle cluster provider errors", async () => {
        // Mock connection error
        mock.module("../src/lib/connectionManager", () => ({
            CouchbaseConnectionManager: {
                getConnection: async () => {
                    throw new Error("Connection failed");
                }
            }
        }));

        try {
            await startServer({
                transport: 'stdio'
            });
            expect(false).toBe(true); // Should not reach here
        } catch (error) {
            expect(error instanceof Error).toBe(true);
            expect((error as Error).message).toContain("Connection failed");
        }
    });

    test("should handle server connection errors", async () => {
        mockMcpServer.connect = mock(async () => {
            throw new Error("Connection failed");
        });

        try {
            await startServer({
                transport: 'stdio'
            });
            expect(false).toBe(true); // Should not reach here
        } catch (error) {
            expect(error instanceof Error).toBe(true);
            expect((error as Error).message).toContain("Connection failed");
        }
    });
}); 