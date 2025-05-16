/* src/resources/markdownDocumentationResource.ts */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../lib/logger";
import type { Bucket } from "couchbase";
import { createError } from "../lib/errors";
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Configuration for the markdown documentation resource
 */
interface MarkdownDocsConfig {
  /**
   * Base directory for the documentation files
   */
  baseDirectory: string;
  
  /**
   * Default extension for documentation files (e.g., .md)
   */
  fileExtension: string;
}

/**
 * Registers a resource for serving markdown documentation files
 * that match the database's scope and collection structure
 */
export function registerMarkdownDocumentationResource(
  server: McpServer,
  bucket: Bucket,
  config: MarkdownDocsConfig
): void {
  // Validate config
  if (!config.baseDirectory) {
    throw createError("CONFIG_ERROR", "baseDirectory is required for markdown documentation resource");
  }
  
  const fileExtension = config.fileExtension || '.md';
  
  // Helper function to sanitize file paths
  const sanitizePath = (inputPath: string): string => {
    // Remove any path traversal attempts
    const normalized = path.normalize(inputPath)
      .replace(/^(\.\.(\/|\\|$))+/, '');
    
    return normalized;
  };
  
  // Register resource for documentation at the scope level
  server.resource(
    "scope-documentation",
    new ResourceTemplate("docs://{scope}", { list: undefined }),
    async (uri, { scope }) => {
      try {
        logger.info("Fetching scope documentation", { scope });
        
        const scopePath = path.join(config.baseDirectory, sanitizePath(scope));
        const scopeDocPath = path.join(scopePath, `index${fileExtension}`);
        
        let documentationText = "";
        
        try {
          // Try to read the scope-level documentation
          documentationText = await fs.readFile(scopeDocPath, 'utf-8');
        } catch (readError) {
          if (readError instanceof Error && 'code' in readError && readError.code === 'ENOENT') {
            // If the file doesn't exist, provide a friendly message
            documentationText = `# Scope: ${scope}\n\nNo documentation is available for this scope.`;
          } else {
            throw readError;
          }
        }
        
        // List available collection documentation in this scope
        try {
          const dirEntries = await fs.readdir(scopePath, { withFileTypes: true });
          const collections = dirEntries
            .filter(entry => entry.isDirectory())
            .map(dir => dir.name);
          
          if (collections.length > 0) {
            documentationText += "\n\n## Available Collections\n\n";
            
            for (const collection of collections) {
              documentationText += `- [${collection}](docs://${scope}/${collection})\n`;
            }
          }
        } catch (dirError) {
          // Directory might not exist, which is fine
          if (dirError instanceof Error && 'code' in dirError && dirError.code !== 'ENOENT') {
            throw dirError;
          }
        }
        
        return {
          contents: [{
            uri: uri.href,
            type: "text/markdown",
            text: documentationText
          }]
        };
      } catch (error) {
        logger.error("Error fetching scope documentation", {
          error: error instanceof Error ? error.message : String(error),
          scope
        });
        
        return {
          contents: [{
            uri: uri.href,
            type: "text/plain",
            text: `Error fetching documentation: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  // Register resource for documentation at the collection level
  server.resource(
    "collection-documentation",
    new ResourceTemplate("docs://{scope}/{collection}", { list: undefined }),
    async (uri, { scope, collection }) => {
      try {
        logger.info("Fetching collection documentation", { scope, collection });
        
        const collectionPath = path.join(
          config.baseDirectory, 
          sanitizePath(scope), 
          sanitizePath(collection)
        );
        const docPath = path.join(collectionPath, `index${fileExtension}`);
        
        let documentationText = "";
        
        try {
          // Try to read the collection-level documentation
          documentationText = await fs.readFile(docPath, 'utf-8');
        } catch (readError) {
          if (readError instanceof Error && 'code' in readError && readError.code === 'ENOENT') {
            // If the file doesn't exist, provide a friendly message
            documentationText = `# Collection: ${collection}\n\nNo documentation is available for this collection.`;
          } else {
            throw readError;
          }
        }
        
        // List additional documentation files in this collection
        try {
          const dirEntries = await fs.readdir(collectionPath, { withFileTypes: true });
          const docFiles = dirEntries
            .filter(entry => entry.isFile() && 
                    entry.name.endsWith(fileExtension) && 
                    entry.name !== `index${fileExtension}`)
            .map(file => file.name.replace(fileExtension, ''));
          
          if (docFiles.length > 0) {
            documentationText += "\n\n## Additional Documentation\n\n";
            
            for (const docFile of docFiles) {
              documentationText += `- [${docFile}](docs://${scope}/${collection}/${docFile})\n`;
            }
          }
        } catch (dirError) {
          // Directory might not exist, which is fine
          if (dirError instanceof Error && 'code' in dirError && dirError.code !== 'ENOENT') {
            throw dirError;
          }
        }
        
        return {
          contents: [{
            uri: uri.href,
            type: "text/markdown",
            text: documentationText
          }]
        };
      } catch (error) {
        logger.error("Error fetching collection documentation", {
          error: error instanceof Error ? error.message : String(error),
          scope,
          collection
        });
        
        return {
          contents: [{
            uri: uri.href,
            type: "text/plain",
            text: `Error fetching documentation: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  // Register resource for specific documentation files within a collection
  server.resource(
    "documentation-file",
    new ResourceTemplate("docs://{scope}/{collection}/{file}", { list: undefined }),
    async (uri, { scope, collection, file }) => {
      try {
        logger.info("Fetching specific documentation file", { scope, collection, file });
        
        const docPath = path.join(
          config.baseDirectory, 
          sanitizePath(scope), 
          sanitizePath(collection), 
          `${sanitizePath(file)}${fileExtension}`
        );
        
        try {
          // Read the specific documentation file
          const documentationText = await fs.readFile(docPath, 'utf-8');
          
          return {
            contents: [{
              uri: uri.href,
              type: "text/markdown",
              text: documentationText
            }]
          };
        } catch (readError) {
          if (readError instanceof Error && 'code' in readError && readError.code === 'ENOENT') {
            return {
              contents: [{
                uri: uri.href,
                type: "text/plain",
                text: `Documentation file '${file}' not found in ${scope}/${collection}`
              }]
            };
          }
          throw readError;
        }
      } catch (error) {
        logger.error("Error fetching documentation file", {
          error: error instanceof Error ? error.message : String(error),
          scope,
          collection,
          file
        });
        
        return {
          contents: [{
            uri: uri.href,
            type: "text/plain",
            text: `Error fetching documentation: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  // Register a resource to browse all available documentation
  server.resource(
    "documentation-browser",
    new ResourceTemplate("docs://", { list: undefined }),
    async (uri) => {
      try {
        logger.info("Browsing documentation structure");
        
        // List all scopes
        const dirEntries = await fs.readdir(config.baseDirectory, { withFileTypes: true });
        const scopes = dirEntries
          .filter(entry => entry.isDirectory())
          .map(dir => dir.name);
        
        let documentationText = "# Documentation Browser\n\n";
        documentationText += "Browse documentation for database scopes and collections.\n\n";
        
        if (scopes.length > 0) {
          documentationText += "## Available Scopes\n\n";
          
          for (const scope of scopes) {
            documentationText += `- [${scope}](docs://${scope})\n`;
          }
        } else {
          documentationText += "No documentation is available yet.";
        }
        
        return {
          contents: [{
            uri: uri.href,
            type: "text/markdown",
            text: documentationText
          }]
        };
      } catch (error) {
        logger.error("Error browsing documentation structure", {
          error: error instanceof Error ? error.message : String(error)
        });
        
        return {
          contents: [{
            uri: uri.href,
            type: "text/plain",
            text: `Error browsing documentation: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  logger.info("Markdown documentation resources registered successfully", {
    baseDirectory: config.baseDirectory,
    fileExtension
  });
} 