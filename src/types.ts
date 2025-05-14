/* src/types.ts */

import { Cluster, Bucket, Scope, Collection, DocumentNotFoundError, CouchbaseError, type QueryOptions, QueryResult, StreamableRowPromise, QueryMetaData } from "couchbase";
import type { AppError } from "./lib/errors";

/**
 * Environment configuration type
 */
export type EnvConfig = {
    MCP_SERVER_NAME?: string;
    FASTMCP_PORT?: string;
    MCP_TRANSPORT?: string;
    READ_ONLY_QUERY_MODE?: string;
    LOG_LEVEL?: string;
    COUCHBASE_URL?: string;
    COUCHBASE_USERNAME?: string;
    COUCHBASE_PASSWORD?: string;
    COUCHBASE_BUCKET?: string;
    COUCHBASE_SCOPE?: string;
    COUCHBASE_COLLECTION?: string;
    CN_ROOT?: string;
    CXXCBC_CACHE_DIR?: string;
}

/**
 * Server dependencies type
 */
export type ServerDependencies = {
    transport: 'stdio' | 'sse';
    port?: number;
};

/**
 * Application context for the MCP server
 */
export interface AppContext {
    readOnlyQueryMode: boolean;
    cluster?: Cluster | null;
    bucket?: Bucket | null;
    capellaConn?: Cluster | null;
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
  name: string;
  version: string;
  port: number;
  transportMode: 'stdio' | 'sse';
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
  cluster: Cluster;
  bucket: (name: string) => Bucket;
  scope: (bucket: string, name: string) => Scope;
  collection: (bucket: string, scope: string, name: string) => Collection;
  defaultBucket: Bucket;
  defaultScope: Scope;
  defaultCollection: Collection;
  CouchbaseError: typeof CouchbaseError;
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
  rawQuery?: string;
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

export interface ToolContext {
  lifespanContext: {
    bucket: Bucket;
    readOnlyQueryMode: boolean;
  };
}

export interface ToolParams {
  scope_name: string;
  collection_name?: string;
  document_id?: string;
  document_content?: DocumentContent;
  query?: string;
}

export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export interface CouchbaseConfig {
  url?: string;
  username?: string;
  password?: string;
  bucket?: string;
  scope?: string;
  collection?: string;
}