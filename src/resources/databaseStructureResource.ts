/* src/resources/databaseStructureResource.ts */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, createContextLogger } from "../lib/logger";
import type { Bucket } from "couchbase";

const resourceLogger = createContextLogger('DatabaseStructureResource');

/**
 * Register a database structure resource
 * This provides an overview of the Couchbase database structure
 */
export function registerDatabaseStructureResource(server: McpServer, bucket: Bucket): void {
  // Define a static resource - simple URI without parameters
  server.resource(
    "database-structure", // Name of the resource
    "database://structure", // URI for the resource
    
    // Resource handler function
    async (uri) => {
      try {
        resourceLogger.info('Fetching database structure resource');
        
        // Get all scopes and collections from Couchbase
        const scopes = await bucket.collections().getAllScopes();
        
        // Format as markdown for better readability
        let structureText = '# Couchbase Database Structure\n\n';
        structureText += `## Bucket: ${bucket.name}\n\n`;
        
        // Track stats for summary
        let totalScopes = 0;
        let totalCollections = 0;
        
        // Build the structure document
        for (const scope of scopes) {
          totalScopes++;
          structureText += `### Scope: ${scope.name}\n\n`;
          
          if (scope.collections.length === 0) {
            structureText += 'This scope contains no collections.\n\n';
            continue;
          }
          
          structureText += 'Collections:\n\n';
          
          for (const coll of scope.collections) {
            totalCollections++;
            structureText += `- **${coll.name}**\n`;
            
            // Add a note about how to access this collection's schema and documents
            structureText += `  - Schema URI: \`schema://${scope.name}/${coll.name}\`\n`;
            structureText += `  - Document URI format: \`document://${scope.name}/${coll.name}/{id}\`\n\n`;
          }
        }
        
        // Add a summary
        structureText += `## Summary\n\n`;
        structureText += `- Total Scopes: ${totalScopes}\n`;
        structureText += `- Total Collections: ${totalCollections}\n`;
        
        // Return the response in the required MCP resource format
        return {
          contents: [{
            uri: uri.href,        // Echo back the URI that was requested
            type: "text/markdown", // Set the MIME type
            text: structureText   // The actual content
          }]
        };
      } catch (error) {
        // Handle any errors that might occur
        resourceLogger.error('Error fetching database structure', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        // Return an error response in the required format
        return {
          contents: [{
            uri: uri.href,
            type: "text/plain",
            text: `Error fetching database structure: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  resourceLogger.info('Database structure resource registered successfully');
} 