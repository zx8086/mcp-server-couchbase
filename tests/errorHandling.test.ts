/* tests/errorHandling.test.ts */

import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { getCluster } from "../src/lib/couchbaseConnector";
import { logger } from "../src/lib/logger";
import type { CapellaConn } from "../src/types";
import { MockMcpServer } from "./tools.test";
import toolRegistry from "../src/tools";

describe("Error Handling Tests", () => {
    let connection: CapellaConn;
    let mockServer: MockMcpServer;
    const TEST_DOC_ID = "error_handling_test_doc";

    beforeAll(async () => {
        connection = await getCluster();
        mockServer = new MockMcpServer();
        Object.entries(toolRegistry).forEach(([name, handler]) => {
            handler(mockServer as any, connection.defaultBucket);
        });
    });

    afterAll(async () => {
        if (connection?.defaultBucket) {
            const collection = connection.defaultBucket.scope("_default").collection("_default");
            try {
                await collection.remove(TEST_DOC_ID);
            } catch (error) {
                logger.info(`No test document to clean up: ${TEST_DOC_ID}`);
            }
            if (connection.cluster) {
                await connection.cluster.close();
            }
        }
    });

    // ... rest of the tests ...
}); 