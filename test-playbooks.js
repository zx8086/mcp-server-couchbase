#!/usr/bin/env node

// test-playbooks.js - A simple script to test playbook resource functionality

const fetch = require('node-fetch');

// Base URL of your running MCP server
const baseUrl = 'http://127.0.0.1:8080';

// Function to make JSON-RPC requests
async function callJsonRpc(method, params = {}) {
  const response = await fetch(`${baseUrl}/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  const data = await response.json();
  return data;
}

async function testPlaybooks() {
  console.log('Testing playbook functionality...');

  try {
    // Test list_playbooks tool
    console.log('\n1. Testing list_playbooks tool...');
    const listResult = await callJsonRpc('tools/call', {
      name: 'list_playbooks',
      args: {},
    });
    console.log('Result:', JSON.stringify(listResult, null, 2));

    // Test get_playbook tool
    console.log('\n2. Testing get_playbook tool...');
    const getResult = await callJsonRpc('tools/call', {
      name: 'get_playbook',
      args: {
        playbook_id: 'query-analysis-tools',
      },
    });
    console.log('Result:', JSON.stringify(getResult, null, 2));

    // Test resources/list endpoint
    console.log('\n3. Testing resources/list endpoint...');
    const resourcesResult = await callJsonRpc('resources/list', {});
    console.log('Result:', JSON.stringify(resourcesResult, null, 2));

    // Test resources/read endpoint for playbook://
    console.log('\n4. Testing resources/read endpoint for playbook:// URI...');
    const readResult = await callJsonRpc('resources/read', {
      uri: 'playbook://',
    });
    console.log('Result:', JSON.stringify(readResult, null, 2));

    // Test resources/read endpoint for a specific playbook
    console.log('\n5. Testing resources/read endpoint for a specific playbook...');
    const readSpecificResult = await callJsonRpc('resources/read', {
      uri: 'playbook://query-analysis-tools',
    });
    console.log('Result:', JSON.stringify(readSpecificResult, null, 2));
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

testPlaybooks();
