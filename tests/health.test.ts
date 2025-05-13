/* tests/health.test.ts */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
// import { McpServer } from '@modelcontextprotocol/sdk';
import { registerHealthChecks } from '../src/lib/health';
import type { capellaConn } from '../src/types';

describe('Health Checks', () => {
  let mockServer: any;
  let mockCapellaConn: capellaConn;

  beforeEach(() => {
    mockServer = {
      tool: mock(() => {})
    };

    mockCapellaConn = {
      defaultBucket: {
        name: 'default',
        collections: () => ({
          getAllScopes: () => Promise.resolve([
            {
              name: '_default',
              collections: [{ name: '_default' }]
            }
          ])
        })
      }
    } as any;
  });

  it('should register health check tool', () => {
    registerHealthChecks(mockServer as unknown as McpServer, mockCapellaConn);
    
    expect(mockServer.tool).toHaveBeenCalledWith(
      'health_check',
      'Check the health of the Couchbase MCP server',
      {},
      expect.any(Function)
    );
  });

  it('should register diagnostics tool', () => {
    registerHealthChecks(mockServer as unknown as McpServer, mockCapellaConn);
    
    expect(mockServer.tool).toHaveBeenCalledWith(
      'get_diagnostics',
      'Get detailed server diagnostics',
      {},
      expect.any(Function)
    );
  });
}); 