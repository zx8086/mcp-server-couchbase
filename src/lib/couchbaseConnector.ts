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

interface QueryableCluster extends Cluster {
  query<TRow = any>(
    statement: string,
    options?: QueryOptions,
  ): StreamableRowPromise<QueryResult<TRow>, TRow, QueryMetaData>;
}

export interface capellaConn {
  cluster: QueryableCluster;
  bucket: (name: string) => Bucket;
  scope: (bucket: string, name: string) => Scope;
  collection: (bucket: string, scope: string, name: string) => Collection;
  defaultBucket: Bucket;
  defaultScope: Scope;
  defaultCollection: Collection;
  errors: {
    DocumentNotFoundError: typeof DocumentNotFoundError;
    CouchbaseError: typeof CouchbaseError;
  };
}

export async function clusterConn(): Promise<capellaConn> {
  console.log("Attempting to connect to Couchbase...");
  try {
    const clusterConnStr: string = Bun.env.COUCHBASE_URL!;
    const username: string = Bun.env.COUCHBASE_USERNAME!;
    const password: string = Bun.env.COUCHBASE_PASSWORD!;
    const bucketName: string = Bun.env.COUCHBASE_BUCKET!;
    const scopeName: string = Bun.env.COUCHBASE_SCOPE!;
    const collectionName: string = Bun.env.COUCHBASE_COLLECTION!;

    console.log(`Configuring connection with the following default connection details:
                    URL: ${clusterConnStr},
                    Username: ${username},
                    Bucket: ${bucketName},
                    Scope: ${scopeName},
                    Collection: ${collectionName}`);

    const cluster: QueryableCluster = await connect(clusterConnStr, {
      username: username,
      password: password,
    });
    console.log("Cluster connection established.");

    const bucket: Bucket = cluster.bucket(bucketName);
    console.log(`Bucket ${bucketName} accessed.`);

    const scope: Scope = bucket.scope(scopeName);
    const collection: Collection = scope.collection(collectionName);
    console.log(`Collection ${collectionName} accessed under scope ${scopeName}.`);

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
  } catch (error) {
    console.error("Couchbase connection failed:", error);
    throw error;
  }
}
