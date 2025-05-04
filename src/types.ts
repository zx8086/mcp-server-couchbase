/* src/types.ts */

import { Cluster, Bucket, Scope, Collection, DocumentNotFoundError, CouchbaseError, type QueryOptions, QueryResult, StreamableRowPromise, QueryMetaData } from "couchbase";

/**
 * Application context for the MCP server
 */
export interface AppContext {
  cluster: Cluster | null;
  bucket: Bucket | null;
  readOnlyQueryMode: boolean;
  capellaConn: capellaConn | null;
}

/**
 * Settings for the MCP server
 */
export interface ServerSettings {
  connectionString: string;
  username: string;
  password: string;
  bucketName: string;
  readOnlyQueryMode: boolean;
  transport: string;
}

/**
 * Interface for MCP server transport JSON-RPC messages
 */
export interface JSONRPCMessage {
  method: string;
  jsonrpc: "2.0";
  id: string | number;
  params?: {
    [x: string]: unknown;
    _meta?: {
      [x: string]: unknown;
      progressToken?: string | number;
    };
  };
}

/**
 * Interface for transport send options
 */
export interface TransportSendOptions {
  [key: string]: unknown;
}

/**
 * Interface for MCP server transport
 */
export interface Transport {
  start(): Promise<void>;
  send(message: JSONRPCMessage, options?: TransportSendOptions): Promise<void>;
  close(): Promise<void>;
}

/**
 * Interface for Couchbase Capella connection
 */
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

/**
 * Interface for Queryable Cluster with query method
 */
export interface QueryableCluster extends Cluster {
  query<TRow = any>(
    statement: string,
    options?: QueryOptions,
  ): StreamableRowPromise<QueryResult<TRow>, TRow, QueryMetaData>;
}

/**
 * SQL++ Parser interface
 */
export interface SQLPPParser {
  parse(query: string): ASTNode;
  modifiesData(parsedQuery: ASTNode): boolean;
  modifiesStructure(parsedQuery: ASTNode): boolean;
}

/**
 * AST Node types for SQL++ parsing
 */
export interface ASTNode {
  type: string;
  value?: string;
  children?: ASTNode[];
  start?: number;
  end?: number;
}

/**
 * Document content interface
 */
export interface DocumentContent {
  [key: string]: any;
}

/**
 * Collection interface for Couchbase collections
 */
export interface CollectionInfo {
  name: string;
}

/**
 * Scope interface for Couchbase scopes
 */
export interface ScopeInfo {
  name: string;
  collections: CollectionInfo[];
}

/**
 * Scopes and collections mapping
 */
export type ScopesCollectionsMap = Record<string, string[]>;