/* src/lib/couchbaseConnector.ts */

import { Cluster, connect, CouchbaseError } from "couchbase";
import { config } from "../config";
import { logger } from "./logger";
import { createError } from "./errors";

export async function getCluster() {
    try {
        if (!config.couchbase.url || !config.couchbase.username || !config.couchbase.password || 
            !config.couchbase.bucket || !config.couchbase.scope || !config.couchbase.collection) {
            throw createError('CONFIG_ERROR', 'Missing required Couchbase configuration');
        }

        const cluster = await connect(config.couchbase.url, {
            username: config.couchbase.username,
            password: config.couchbase.password
        });

        const bucket = cluster.bucket(config.couchbase.bucket);
        const scope = bucket.scope(config.couchbase.scope);
        const collection = scope.collection(config.couchbase.collection);

        return {
            cluster,
            bucket: (name: string) => cluster.bucket(name),
            scope: (bucket: string, name: string) => cluster.bucket(bucket).scope(name),
            collection: (bucket: string, scope: string, name: string) => 
                cluster.bucket(bucket).scope(scope).collection(name),
            defaultBucket: bucket,
            defaultScope: scope,
            defaultCollection: collection,
            CouchbaseError
        };
    } catch (error) {
        logger.error(`Failed to connect to Couchbase: ${error instanceof Error ? error.message : String(error)}`);
        throw createError('DB_ERROR', 'Failed to connect to Couchbase', { error });
    }
}
