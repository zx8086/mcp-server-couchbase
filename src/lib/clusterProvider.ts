/* src/lib/clusterProvider.ts */

import { getCluster as connectToCluster } from "./couchbaseConnector";
import type { capellaConn } from "../types";
import { logger } from "./logger";

let connection: capellaConn | null = null;

export async function getCluster(): Promise<capellaConn> {
    try {
        if (!connection) {
            connection = await connectToCluster();
            logger.info("Connection to Couchbase established successfully.");
        }
        return connection;
    } catch (error) {
        logger.error(`Failed to get cluster connection: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}
