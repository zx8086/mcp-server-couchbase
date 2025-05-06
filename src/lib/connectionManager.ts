/* src/lib/connectionManager.ts */

import type { capellaConn } from "../types";
import { getCluster } from "./clusterProvider";
import { logger } from "./logger";

export class CouchbaseConnectionManager {
    private static instance: capellaConn | null = null;
    private static isInitializing = false;

    private constructor() {
        // Private constructor to prevent direct construction calls with 'new'
    }

    static async getConnection(): Promise<capellaConn> {
        if (!this.instance) {
            if (this.isInitializing) {
                // Wait for initialization to complete
                await new Promise(resolve => setTimeout(resolve, 100));
                return this.getConnection();
            }

            try {
                this.isInitializing = true;
                logger.info("Initializing Couchbase connection...");
                this.instance = await getCluster();
                logger.info("Couchbase connection initialized successfully");
            } catch (error) {
                logger.error(`Failed to initialize Couchbase connection: ${error}`);
                throw error;
            } finally {
                this.isInitializing = false;
            }
        }
        return this.instance;
    }

    static async resetConnection(): Promise<void> {
        this.instance = null;
    }

    // For testing purposes only
    static getMockConnection(mockConn: capellaConn): void {
        this.instance = mockConn;
    }
} 