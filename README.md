# Couchbase MCP Server (TypeScript/Bun Version)

[![Powered by Bun](https://img.shields.io/badge/Powered%20by-Bun-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Couchbase](https://img.shields.io/badge/Couchbase-EA2328?style=for-the-badge&logo=couchbase&logoColor=white)](https://www.couchbase.com/)

An [MCP](https://modelcontextprotocol.io/) server implementation of Couchbase that allows LLMs to directly interact with Couchbase clusters. This is a TypeScript/Bun implementation of the original Python MCP server.

## Features

### Tools
- `get_scopes_and_collections`: List all scopes and collections in the specified bucket
- `get_schema_for_collection`: Get the structure for a collection
- `get_document_by_id`: Retrieve a document by ID from a specified scope and collection
- `upsert_document_by_id`: Create or update a document by ID in a specified scope and collection
- `delete_document_by_id`: Remove a document by ID from a specified scope and collection
- `run_sql_plus_plus_query`: Execute [SQL++ queries](https://www.couchbase.com/sqlplusplus/) on a specified scope

### Resources
- Database Structure Resource: Access and manage database structure information
- Schema Resource: Handle collection schemas and validation
- Document Resource: Manage document operations and CRUD functionality
- Query Resource: Handle SQL++ query operations and results

### Security Features
- `READ_ONLY_QUERY_MODE`: Default enabled setting to prevent SQL++ queries from modifying data
- Secure document operations through ID-based access
- Environment-based configuration for sensitive credentials

## Prerequisites

- [Bun](https://bun.sh/) 1.0 or higher
- A running Couchbase cluster. The easiest way to get started is to use [Capella](https://docs.couchbase.com/cloud/get-started/create-account.html#getting-started) free tier, which is fully managed version of Couchbase server. You can follow [instructions](https://docs.couchbase.com/cloud/clusters/data-service/import-data-documents.html#import-sample-data) to import one of the sample datasets or import your own.
- An [MCP client](https://modelcontextprotocol.io/clients) such as [Claude Desktop](https://claude.ai/download) installed to connect the server to Claude. The instructions are provided for Claude Desktop and Cursor. Other MCP clients could be used as well.

## Configuration

Clone the repository to your local machine.

```bash
git clone https://github.com/yourusername/mcp-server-couchbase-bun.git
cd mcp-server-couchbase-bun
```

Install dependencies:

```bash
bun install
```

Build the TypeScript project:

```bash
bun run build
```

Create a `.env` file based on the example:

```bash
cp .env.example .env
# Edit .env with your Couchbase credentials
```

### Server Configuration for MCP Clients

This is the common configuration for the MCP clients such as Claude Desktop, Cursor, Windsurf Editor.

```json
{
  "mcpServers": {
    "couchbase": {
      "command": "bun",
      "args": [
        "--directory",
        "path/to/cloned/repo/mcp-server-couchbase-bun/",
        "run",
        "dist/mcp_server.js"
      ],
      "env": {
        "CB_CONNECTION_STRING": "couchbases://connection-string",
        "CB_USERNAME": "username",
        "CB_PASSWORD": "password",
        "CB_BUCKET_NAME": "bucket_name"
      }
    }
  }
}
```

The server can be configured using environment variables. The following variables are supported:

- `CB_CONNECTION_STRING`: The connection string to the Couchbase cluster
- `CB_USERNAME`: The username with access to the bucket to use to connect
- `CB_PASSWORD`: The password for the username to connect
- `CB_BUCKET_NAME`: The name of the bucket that the server will access
- `READ_ONLY_QUERY_MODE`: Setting to configure whether SQL++ queries that allow data to be modified are allowed. It is set to True by default.
- `path/to/cloned/repo/mcp-server-couchbase-bun/` should be the path to the cloned repository on your local machine. Don't forget the trailing slash at the end!

> Note: If you have other MCP servers in use in the client, you can add it to the existing `mcpServers` object.

### Running the Server

You can run the server directly with:

```bash
# Development mode (TypeScript directly)
bun run dev

# Production mode (compiled JavaScript)
bun run start
```

For SSE transport mode:

```bash
# Development mode (TypeScript directly)
bun run dev:sse

# Production mode (compiled JavaScript)
bun run start:sse
```

### Client Setup Instructions

Setup instructions for Claude Desktop, Cursor, and Windsurf Editor remain the same as the original Python version, just adjust the command to use `bun` instead of `uv`.

### SSE Server Mode

There is an option to run the MCP server in [Server-Sent Events (SSE)](https://modelcontextprotocol.io/docs/concepts/transports#server-sent-events-sse) transport mode.

#### Usage

By default, the MCP server will run on port 8080 but this can be configured using the `FASTMCP_PORT` environment variable.

```bash
bun run dist/mcp_server.js --connection-string='<couchbase_connection_string>' --username='<database_username>' --password='<database_password>' --bucket-name='<couchbase_bucket_to_use>' --read-only-query-mode=true --transport=sse
```

The server will be available on http://localhost:8080/sse. This can be used in MCP clients supporting SSE transport mode.

## Docker Image

The MCP server can also be built and run as a Docker container.

```bash
docker build -t mcp/couchbase-bun .
```

### Running with Docker

The MCP server can be run with the environment variables being used to configure the Couchbase settings. The environment variables are the same as described in the [Configuration section](#server-configuration-for-mcp-clients)

```bash
docker run -i \
  -e CB_CONNECTION_STRING='<couchbase_connection_string>' \
  -e CB_USERNAME='<database_user>' \
  -e CB_PASSWORD='<database_password>' \
  -e CB_BUCKET_NAME='<bucket_name>' \
  -e MCP_TRANSPORT='stdio/sse' \
  -e READ_ONLY_QUERY_MODE="true/false" \
  mcp/couchbase-bun
```

### Risks Associated with LLMs

- The use of large language models and similar technology involves risks, including the potential for inaccurate or harmful outputs.
- Couchbase does not review or evaluate the quality or accuracy of such outputs, and such outputs may not reflect Couchbase's views.
- You are solely responsible for determining whether to use large language models and related technology, and for complying with any license terms, terms of use, and your organization's policies governing your use of the same.

## TypeScript Implementation Notes

This implementation offers several advantages over the original Python version:

1. **Type Safety**: Strong typing for all functions, parameters, and return values
2. **Developer Experience**: Better IDE support with autocompletion and inline documentation
3. **Performance**: Bun runtime provides excellent performance for JavaScript/TypeScript applications

## Troubleshooting Tips

- Ensure the path to your MCP server repository is correct in the configuration.
- Verify that your Couchbase connection string, database username, password and bucket name are correct.
- If using Couchbase Capella, ensure that the cluster is [accessible](https://docs.couchbase.com/cloud/clusters/allow-ip-address.html) from the machine where the MCP server is running.
- Check that the database user has proper permissions to access the specified bucket.
- Confirm that Bun is properly installed and accessible.
- Check the logs for any errors or warnings that may indicate issues with the MCP server.

---

## 📢 Support Policy

We truly appreciate your interest in this project!
This project is **community-maintained**, which means it's **not officially supported** by our support team.

If you need help, have found a bug, or want to contribute improvements, the best place to do that is right here — by [opening a GitHub issue](https://github.com/yourusername/mcp-server-couchbase-bun/issues).
Our support portal is unable to assist with requests related to this project, so we kindly ask that all inquiries stay within GitHub.

Your collaboration helps us all move forward together — thank you!
