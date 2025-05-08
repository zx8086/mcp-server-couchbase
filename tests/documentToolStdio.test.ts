import { test, expect } from "bun:test";

// Adjust the path to your server entry point if needed
const SERVER_ENTRY = "src/index.ts";

test("get_document_by_id works with correct params (stdio integration)", async () => {
  // Start the real server process
  const proc = Bun.spawn(["bun", "run", SERVER_ENTRY], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit"
  });

  // Wait for server to be ready (adjust delay as needed)
  await new Promise((r) => setTimeout(r, 1500));

  // Prepare the request
  const request = {
    method: "tools/call",
    params: {
      name: "get_document_by_id",
      arguments: {
        scope_name: "_default",
        collection_name: "_default",
        document_id: "capella_quote"
      }
    },
    jsonrpc: "2.0",
    id: 1
  };

  // Send the request
  proc.stdin.write(JSON.stringify(request) + "\n");

  // Read the response
  let output = "";
  const reader = proc.stdout.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    output += value;
    if (output.includes('"id":1')) break; // crude way to detect response
  }
  reader.releaseLock();

  // Check the output
  expect(output).toContain("result");
  expect(output).not.toContain('"isError":true');
  proc.kill();
});

test("echo tool returns what it receives (stdio integration)", async () => {
  const proc = Bun.spawn(["bun", "run", SERVER_ENTRY], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit"
  });

  await new Promise((r) => setTimeout(r, 1500));

  const request = {
    method: "tools/call",
    params: {
      name: "echo",
      arguments: {
        foo: "bar",
        test: 123
      }
    },
    jsonrpc: "2.0",
    id: 2
  };

  proc.stdin.write(JSON.stringify(request) + "\n");

  let output = "";
  const reader = proc.stdout.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    output += value;
    if (output.includes('"id":2')) break;
  }
  reader.releaseLock();

  expect(output).toContain("result");
  expect(output).toContain("foo");
  expect(output).toContain("bar");
  expect(output).toContain("test");
  proc.kill();
}); 