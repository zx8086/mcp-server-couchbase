import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { McpServer } from '@modelcontextprotocol/sdk';
import { registerResourceMethods } from '../src/lib/resources';
import { getResourcesList, getPromptsList } from '../src/lib/resources';

describe('Resource Methods', () => {
  let mockServer: any;

  beforeEach(() => {
    mockServer = {
      tool: mock(() => {}),
      method: mock(() => {})
    };
  });

  it('should register resources_list and prompts_list as tools', () => {
    registerResourceMethods(mockServer as unknown as McpServer);
    
    expect(mockServer.tool).toHaveBeenCalledWith(
      'resources_list',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    
    expect(mockServer.tool).toHaveBeenCalledWith(
      'prompts_list',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should return correct resources list', async () => {
    const resources = getResourcesList();
    expect(resources).toBeInstanceOf(Array);
    expect(resources).toHaveLength(4);
    
    // Verify each resource has required properties
    resources.forEach(resource => {
      expect(resource).toHaveProperty('id');
      expect(resource).toHaveProperty('name');
      expect(resource).toHaveProperty('description');
      expect(resource).toHaveProperty('type');
      expect(resource).toHaveProperty('capabilities');
    });

    // Verify specific resources
    const resourceIds = resources.map(r => r.id);
    expect(resourceIds).toContain('couchbase-database');
    expect(resourceIds).toContain('scopes-collections');
    expect(resourceIds).toContain('schema');
    expect(resourceIds).toContain('query-engine');
  });

  it('should return correct prompts list', async () => {
    const prompts = getPromptsList();
    expect(prompts).toBeInstanceOf(Array);
    expect(prompts).toHaveLength(4);
    
    // Verify each prompt has required properties
    prompts.forEach(prompt => {
      expect(prompt).toHaveProperty('id');
      expect(prompt).toHaveProperty('name');
      expect(prompt).toHaveProperty('description');
      expect(prompt).toHaveProperty('type');
      expect(prompt).toHaveProperty('capabilities');
    });

    // Verify specific prompts
    const promptIds = prompts.map(p => p.id);
    expect(promptIds).toContain('query-generator');
    expect(promptIds).toContain('schema-analyzer');
    expect(promptIds).toContain('document-validator');
    expect(promptIds).toContain('index-advisor');
  });
}); 