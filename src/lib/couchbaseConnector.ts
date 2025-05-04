/* src/lib/couchbaseConnector.ts */

// import config from "$config";
// import { log, err } from "$utils/logger";
import {
  Cluster,
  Bucket,
  Scope,
  Collection,
  connect,
  type QueryOptions,
  QueryResult,
  StreamableRowPromise,
  QueryMetaData,
  DocumentNotFoundError,
  CouchbaseError,
} from "couchbase";
import type { QueryableCluster, capellaConn } from "../types";
import { logger } from "./logger";
import { createError } from "./errors";

export async function clusterConn(): Promise<capellaConn> {
  logger.info("Attempting to connect to Couchbase...");
  try {
    const clusterConnStr: string = Bun.env.COUCHBASE_URL!;
    const username: string = Bun.env.COUCHBASE_USERNAME!;
    const password: string = Bun.env.COUCHBASE_PASSWORD!;
    const bucketName: string = Bun.env.COUCHBASE_BUCKET!;
    const scopeName: string = Bun.env.COUCHBASE_SCOPE!;
    const collectionName: string = Bun.env.COUCHBASE_COLLECTION!;

    if (!clusterConnStr || !username || !password || !bucketName || !scopeName || !collectionName) {
      throw createError('CONFIG_ERROR', "Missing required Couchbase configuration", {
        missing: [
          !clusterConnStr && 'COUCHBASE_URL',
          !username && 'COUCHBASE_USERNAME',
          !password && 'COUCHBASE_PASSWORD',
          !bucketName && 'COUCHBASE_BUCKET',
          !scopeName && 'COUCHBASE_SCOPE',
          !collectionName && 'COUCHBASE_COLLECTION'
        ].filter(Boolean)
      });
    }

    logger.info(`Configuring connection with the following default connection details:
                    URL: ${clusterConnStr},
                    Username: ${username},
                    Bucket: ${bucketName},
                    Scope: ${scopeName},
                    Collection: ${collectionName}`);

    const cluster: QueryableCluster = await connect(clusterConnStr, {
      username: username,
      password: password,
    });
    logger.info("Cluster connection established.");

    const bucket: Bucket = cluster.bucket(bucketName);
    logger.info(`Bucket ${bucketName} accessed.`);

    const scope: Scope = bucket.scope(scopeName);
    const collection: Collection = scope.collection(collectionName);
    logger.info(`Collection ${collectionName} accessed under scope ${scopeName}.`);

    return {
      cluster,
      bucket: (name: string) => cluster.bucket(name),
      scope: (bucket: string, name: string) =>
        cluster.bucket(bucket).scope(name),
      collection: (bucket: string, scope: string, name: string) =>
        cluster.bucket(bucket).scope(scope).collection(name),
      defaultBucket: bucket,
      defaultScope: scope,
      defaultCollection: collection,
      errors: {
        DocumentNotFoundError,
        CouchbaseError,
      },
    };
  } catch (error: any) {
    logger.error("Couchbase connection failed:", error);
    throw createError('DB_ERROR', "Failed to establish Couchbase connection", {
      error: error.message
    });
  }
}
