/* src/lib/connectionManager.ts */

import type { capellaConn } from "../types";
import { getCluster } from "./clusterProvider";
import { logger } from "./logger";

function getConnLogger() {
  const { createContextLogger } = require("./logger");
  return createContextLogger("ConnectionManager");
}

export class CouchbaseConnectionManager {
  private static instance: capellaConn | null = null;
  private static isInitializing = false;
  private static retryCount = 0;
  private static maxRetries = 3;
  private static retryDelay = 1000; // ms

  private constructor() {
    // Private constructor to prevent direct construction calls with 'new'
  }

  static async getConnection(): Promise<capellaConn> {
    if (!this.instance) {
      if (this.isInitializing) {
        getConnLogger().debug("Connection initialization in progress, waiting...");
        await new Promise((resolve) => setTimeout(resolve, 100));
        return this.getConnection();
      }

      try {
        this.isInitializing = true;
        getConnLogger().info("Initializing Couchbase connection", {
          retryCount: this.retryCount,
          maxRetries: this.maxRetries,
        });
        this.instance = await this.connectWithRetry();
        getConnLogger().info("Couchbase connection initialized successfully", {
          retryCount: this.retryCount,
        });
        // Reset retry counter on success
        this.retryCount = 0;
      } catch (error) {
        getConnLogger().error("Failed to initialize Couchbase connection", {
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

  private static async connectWithRetry(): Promise<capellaConn> {
    try {
      return await getCluster();
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        getConnLogger().warn("Connection attempt failed, retrying", {
          attempt: this.retryCount,
          maxRetries: this.maxRetries,
          delay: this.retryDelay,
          error: error instanceof Error ? error.message : String(error),
        });
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.connectWithRetry();
      }
      throw error;
    }
  }

  static async resetConnection(): Promise<void> {
    this.instance = null;
    this.retryCount = 0;
  }

  static getMockConnection(mockConn: capellaConn): void {
    this.instance = mockConn;
  }

  static async checkHealth(): Promise<boolean> {
    if (!this.instance) {
      getConnLogger().warn("Health check failed - no active connection");
      return false;
    }

    try {
      await this.instance.cluster.ping();
      getConnLogger().debug("Health check successful");
      return true;
    } catch (error) {
      getConnLogger().error("Health check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
