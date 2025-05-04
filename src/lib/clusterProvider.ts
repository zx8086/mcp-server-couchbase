/* src/lib/clusterProvider.ts */

// import { log, err } from "$utils/logger";
import { clusterConn } from "./couchbaseConnector";
import type { capellaConn } from "../types";
import { logger } from "./logger";
import { createError } from "./errors";

let connection: capellaConn | null = null;

export const getCluster = async (): Promise<capellaConn> => {
  try {
    if (!connection) {
      connection = await clusterConn();
      logger.info("Connection to Couchbase established successfully.");
    }
    return connection;
  } catch (error: any) {
    logger.error("Error connecting to Couchbase:", error);
    throw createError('DB_ERROR', "Failed to connect to Couchbase", {
      error: error.message
    });
  }
};
