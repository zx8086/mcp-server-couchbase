# Query Analysis Tools Quick Reference

This guide provides a quick reference for using the Couchbase query analysis tools in the MCP server.

## Performance Analysis Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `get_most_expensive_queries` | Find resource-intensive queries | `get_most_expensive_queries({ limit: 10, period: "week" })` |
| `get_longest_running_queries` | Find slow queries | `get_longest_running_queries({ limit: 10, min_time_ms: 1000 })` |
| `get_most_frequent_queries` | Find commonly executed queries | `get_most_frequent_queries({ limit: 10, min_count: 100 })` |
| `get_largest_result_size_queries` | Find queries returning large data volumes | `get_largest_result_size_queries({ limit: 10, min_size_kb: 100 })` |
| `get_largest_result_count_queries` | Find queries returning many results | `get_largest_result_count_queries({ limit: 10, min_count: 1000 })` |

## Index Analysis Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `get_system_indexes` | View all indexes | `get_system_indexes({ bucket_name: "default", include_system: false })` |
| `get_primary_index_queries` | Find queries using primary indexes | `get_primary_index_queries({ limit: 10 })` |
| `get_indexes_to_drop` | Identify unused indexes | `get_indexes_to_drop({ bucket_filter: "default,travel-sample" })` |

## Query Execution Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `get_completed_requests` | View query execution details | `get_completed_requests({ limit: 10, period: "day", status: "success" })` |
| `get_fatal_requests` | Find failed queries | `get_fatal_requests({ period: "week", limit: 10 })` |
| `get_prepared_statements` | View cached prepared statements | `get_prepared_statements({ limit: 10 })` |

## Document Analysis Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `get_document_type_examples` | Get sample documents by type | `get_document_type_examples({ scope_name: "inventory", collection_name: "products" })` |
| `analyze_document_structure` | Analyze document schema | `analyze_document_structure({ document_key: "product:123" })` |

## Optimization Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `suggest_query_optimizations` | Get query optimization suggestions | `suggest_query_optimizations({ query: "SELECT * FROM default._default.users WHERE status = 'active'" })` |

## Common Parameters

| Parameter | Used In | Description |
|-----------|---------|-------------|
| `limit` | Most tools | Maximum number of results to return |
| `period` | Time-based tools | Time period to analyze ("day", "week", "month", "quarter") |
| `min_count` | Frequency tools | Minimum execution count to include |
| `min_time_ms` | Performance tools | Minimum execution time in milliseconds |
| `min_size_kb` | Size tools | Minimum result size in kilobytes |
| `bucket_name` | Index tools | Bucket to analyze |
| `scope_name` | Most tools | Scope to analyze |
| `collection_name` | Most tools | Collection to analyze |
| `document_key` | Document tools | Document ID to analyze |
| `query` | Optimization tools | SQL++ query to analyze |

## Common Workflow Scenarios

### Scenario 1: Finding and Optimizing Slow Queries

```
// Step 1: Identify slow queries
get_longest_running_queries({ limit: 5 })

// Step 2: For each slow query, get optimization suggestions
suggest_query_optimizations({ query: "YOUR_SLOW_QUERY_HERE" })

// Step 3: Create recommended indexes and monitor results
get_completed_requests({ limit: 10 })
```

### Scenario 2: Index Cleanup

```
// Step 1: Identify unused indexes
get_indexes_to_drop({ bucket_filter: "your_bucket" })

// Step 2: Review current indexes
get_system_indexes({ bucket_name: "your_bucket" })

// Step 3: Check for queries using primary indexes
get_primary_index_queries({ limit: 10 })
```

### Scenario 3: Document Structure Analysis

```
// Step 1: Find document type examples
get_document_type_examples({ scope_name: "your_scope", collection_name: "your_collection" })

// Step 2: Analyze document structure
analyze_document_structure({ document_key: "example_document_id" })

// Step 3: Get query optimization recommendations
suggest_query_optimizations({ query: "YOUR_QUERY_HERE" })
```

## Tips for Effective Analysis

1. **Start broad, then narrow down**: Begin with high-level tools like `get_most_expensive_queries`, then drill down with more specific tools.

2. **Focus on the biggest impact items**: Address the most expensive queries first for the greatest performance improvement.

3. **Use document analysis to inform index design**: Understanding document structure is crucial for creating optimal indexes.

4. **Combine tools for comprehensive insights**: Use multiple tools together to get a complete picture of performance.

5. **Monitor before and after changes**: Use query execution tools to verify improvements after implementing changes.
