import { test, expect } from "bun:test";

test("echo tool works with SSE transport", async () => {
  // Make sure your server is running with MCP_TRANSPORT=sse on port 8080
  const response = await fetch("http://localhost:8080/sse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "tools/call",
      params: {
        name: "echo",
        arguments: { foo: "bar", test: 123 }
      },
      jsonrpc: "2.0",
      id: 1
    })
  });

  const data = await response.json();
  expect(data.result).toBeDefined();
  expect(JSON.stringify(data)).toContain("foo");
  expect(JSON.stringify(data)).toContain("bar");
  expect(JSON.stringify(data)).toContain("test");
}); 