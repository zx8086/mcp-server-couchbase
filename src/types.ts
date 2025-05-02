import { Cluster, Bucket } from "couchbase";

/**
 * Application context for the MCP server
 */
export interface AppContext {
  cluster: Cluster | null;
  bucket: Bucket | null;
  readOnlyQueryMode: boolean;
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
 * SQL++ Parser interface
 */
export interface SQLPPParser {
  parse(query: string): any;
  modifiesData(parsedQuery: any): boolean;
  modifiesStructure(parsedQuery: any): boolean;
}

/**
 * Document content interface
 */
export interface DocumentContent {
  [key: string]: any;
}

/**
 * Scopes and collections mapping
 */
export type ScopesCollectionsMap = Record<string, string[]>;
