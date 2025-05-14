/* src/lib/connectionManager.ts */

import { getCluster as connectToCluster } from "./couchbaseConnector";
import type { CapellaConn } from "../types";
import { logger, createContextLogger } from "./logger";

const connLogger = createContextLogger("ConnectionManager");

// Constants for connection management
const CONNECTION_CONSTANTS = {
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    CONCURRENT_INIT_WAIT_MS: 100,
    HEALTH_CHECK_TIMEOUT_MS: 5000
} as const;

/**
 * Unified connection manager for Couchbase
 * Combines the functionality of the previous clusterProvider and connectionManager
 */
export class CouchbaseConnectionManager {
    private static instance: CapellaConn | null = null;
    private static isInitializing = false;
    private static retryCount = 0;

    /**
     * Gets a connection to the Couchbase cluster
     * Will establish a connection if one doesn't exist
     * Includes retry logic
     */
    static async getConnection(): Promise<CapellaConn> {
        if (!this.instance) {
            // Handle concurrent initialization requests
            if (this.isInitializing) {
                connLogger.debug("Connection initialization in progress, waiting...");
                await new Promise((resolve) => setTimeout(resolve, CONNECTION_CONSTANTS.CONCURRENT_INIT_WAIT_MS));
                return this.getConnection();
            }

            try {
                this.isInitializing = true;
                connLogger.info("Initializing Couchbase connection", {
                    retryCount: this.retryCount,
                    maxRetries: CONNECTION_CONSTANTS.MAX_RETRIES,
                });
                
                this.instance = await this.connectWithRetry();
                
                connLogger.info("Couchbase connection initialized successfully", {
                    retryCount: this.retryCount,
                });
                // Reset retry counter on success
                this.retryCount = 0;
            } catch (error) {
                connLogger.error("Failed to initialize Couchbase connection", {
                    error: error instanceof Error ? error.message : String(error),
                    retryCount: this.retryCount,
                });
                throw error;
            } finally {
                this.isInitializing = false;
            }
        }
        return this.instance;
    }

    /**
     * Attempts to establish a connection with retry logic
     */
    private static async connectWithRetry(): Promise<CapellaConn> {
        try {
            return await connectToCluster();
        } catch (error) {
            if (this.retryCount < CONNECTION_CONSTANTS.MAX_RETRIES) {
                this.retryCount++;
                connLogger.warn("Connection attempt failed, retrying", {
                    attempt: this.retryCount,
                    maxRetries: CONNECTION_CONSTANTS.MAX_RETRIES,
                    delay: CONNECTION_CONSTANTS.RETRY_DELAY_MS,
                    error: error instanceof Error ? error.message : String(error),
                });
                await new Promise((resolve) => setTimeout(resolve, CONNECTION_CONSTANTS.RETRY_DELAY_MS));
                return this.connectWithRetry();
            }
            throw error;
        }
    }

    /**
     * Resets the connection
     * Useful for testing or after connection errors
     */
    static async resetConnection(): Promise<void> {
        this.instance = null;
        this.retryCount = 0;
        connLogger.info("Connection reset");
    }

    /**
     * Sets a mock connection (useful for testing)
     */
    static setMockConnection(mockConn: CapellaConn): void {
        this.instance = mockConn;
        connLogger.info("Mock connection set");
    }

    /**
     * Checks if the connection is healthy
     */
    static async checkHealth(): Promise<boolean> {
        if (!this.instance) {
            connLogger.warn("Health check failed - no active connection");
            return false;
        }

        try {
            await this.instance.cluster.ping();
            connLogger.debug("Health check successful");
            return true;
        } catch (error) {
            connLogger.error("Health check failed", {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }
}

// Export a convenience function for simple access
export async function getCluster(): Promise<CapellaConn> {
    return CouchbaseConnectionManager.getConnection();
}
