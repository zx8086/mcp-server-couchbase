# Query Analysis Tools

This module provides a set of tools for analyzing and monitoring Couchbase query performance and usage patterns. These tools are designed to help identify performance bottlenecks, inefficient queries, and opportunities for optimization.

## Available Tools

### Most Expensive Queries

The `get_most_expensive_queries` tool identifies the most resource-intensive queries based on execution time and memory usage.

**Example usage:**
```
get_most_expensive_queries({ limit: 10, period: "week" })
```

### Fatal Requests

The `get_fatal_requests` tool retrieves information about failed query requests, including error messages and execution details.

**Example usage:**
```
get_fatal_requests({ period: "month", limit: 10 })
```

### Longest Running Queries

The `get_longest_running_queries` tool identifies queries with the longest execution times, which can be candidates for optimization.

**Example usage:**
```
get_longest_running_queries({ limit: 10, min_time_ms: 1000 })
```

### Most Frequent Queries

The `get_most_frequent_queries` tool shows which queries are executed most often, highlighting opportunities for prepared statements and optimization.

**Example usage:**
```
get_most_frequent_queries({ limit: 10, min_count: 100 })
```

### Largest Result Size Queries

The `get_largest_result_size_queries` tool identifies queries that return the largest amounts of data, which may benefit from result limiting or pagination.

**Example usage:**
```
get_largest_result_size_queries({ limit: 10, min_size_kb: 100 })
```

### Largest Result Count Queries

The `get_largest_result_count_queries` tool finds queries that return the largest number of documents, which may be candidates for pagination.

**Example usage:**
```
get_largest_result_count_queries({ limit: 10, min_count: 1000 })
```

### Primary Index Queries

The `get_primary_index_queries` tool identifies queries that use primary indexes instead of more efficient secondary indexes.

**Example usage:**
```
get_primary_index_queries({ limit: 10 })
```

### System Indexes

The `get_system_indexes` tool provides information about all indexes in the system, including their state and metadata.

**Example usage:**
```
get_system_indexes({ bucket_name: "default", include_system: false })
```

### Completed Requests

The `get_completed_requests` tool retrieves detailed information about recently completed query requests, including execution plans and statistics.

**Example usage:**
```
get_completed_requests({ limit: 10, period: "day", status: "success" })
```

### Indexes to Drop

The `get_indexes_to_drop` tool identifies indexes that have never been used and might be candidates for removal to improve maintenance and creation time.

**Example usage:**
```
get_indexes_to_drop({ bucket_filter: "default,travel-sample" })
```

### Prepared Statements

The `get_prepared_statements` tool shows information about prepared statements that are currently cached in the query engine.

**Example usage:**
```
get_prepared_statements({ limit: 10 })
```

### Document Type Examples

The `get_document_type_examples` tool retrieves sample document keys for each document type, useful for exploring the data model.

**Example usage:**
```
get_document_type_examples({ scope_name: "inventory", collection_name: "products", type_field: "type" })
```

### Document Structure Analysis

The `analyze_document_structure` tool provides detailed analysis of a document's structure, including nesting depth, field types, and indexing recommendations.

**Example usage:**
```
analyze_document_structure({ document_key: "product:123", scope_name: "inventory", collection_name: "products" })
```

### Query Optimization Suggestions

The `suggest_query_optimizations` tool analyzes a SQL++ query and provides optimization recommendations, including index suggestions and query improvements.

**Example usage:**
```
suggest_query_optimizations({ query: "SELECT * FROM `default`.`inventory`.`products` WHERE type = 'electronics'" })
```

## Use Cases

These tools are particularly useful for:

1. Performance tuning and optimization
2. Troubleshooting query issues
3. Capacity planning and resource optimization
4. Index management and optimization
5. Application behavior analysis
6. Identifying opportunities for code improvements

## Query Analysis Workflow

A typical workflow for query analysis:

1. Use `get_most_expensive_queries` to identify resource-intensive queries
2. For problematic queries, use `get_completed_requests` to get detailed execution information
3. Check if queries are using primary indexes with `get_primary_index_queries`
4. Review the document structure and indexing with `get_system_indexes`
5. Optimize indexes based on the analysis
6. Monitor impact using `get_longest_running_queries` and other tools
