# Couchbase Query Analysis and Performance Optimization Tools

This document provides an overview of the query analysis and performance optimization tools added to the MCP server. These tools help you identify performance bottlenecks, optimize queries, and improve database efficiency.

## Available Tools

The following query analysis tools are now available:

### Query Performance Tools

1. **get_most_expensive_queries** - Identifies resource-intensive queries based on execution time and resource usage
2. **get_fatal_requests** - Retrieves information about failed queries and their error messages
3. **get_longest_running_queries** - Finds queries with the longest execution times
4. **get_most_frequent_queries** - Shows which queries are executed most often
5. **get_largest_result_size_queries** - Identifies queries that return the largest amounts of data
6. **get_largest_result_count_queries** - Finds queries that return the largest number of results
7. **get_primary_index_queries** - Identifies queries that use primary indexes instead of more efficient secondary indexes
8. **get_completed_requests** - Retrieves detailed information about recently completed query requests

### Index Management Tools

9. **get_system_indexes** - Provides information about all indexes in the system
10. **get_detailed_indexes** - Provides detailed information about indexes with advanced filtering options
11. **get_indexes_to_drop** - Identifies indexes that have never been used and might be candidates for removal

### Statement Management Tools

12. **get_prepared_statements** - Shows information about prepared statements cached in the query engine
13. **get_detailed_prepared_statements** - Provides detailed information about prepared statements with usage statistics

### Document Analysis Tools

14. **get_document_type_examples** - Retrieves sample document keys for each document type
15. **analyze_document_structure** - Analyzes document structure with indexing recommendations

### Optimization Tools

16. **suggest_query_optimizations** - Provides query optimization suggestions and index recommendations

### System Information Tools

17. **get_system_nodes** - Provides information about all nodes in the Couchbase cluster
18. **get_system_vitals** - Provides detailed system vitals and performance metrics

## Usage Examples

### Finding Expensive Queries

To find the most resource-intensive queries in your Couchbase system:

```
get_most_expensive_queries({ limit: 5, period: "week" })
```

This will return the top 5 most expensive queries from the past week, ranked by execution time.

### Analyzing Document Structure

To analyze the structure of a specific document:

```
analyze_document_structure({ 
  document_key: "user:1234", 
  scope_name: "inventory", 
  collection_name: "users" 
})
```

This provides a detailed analysis of field types, nesting depth, and indexing recommendations.

### Optimizing a Query

To get optimization suggestions for a specific query:

```
suggest_query_optimizations({ 
  query: "SELECT * FROM `default`.`inventory`.`products` WHERE category = 'electronics' ORDER BY price DESC" 
})
```

This analyzes the query and provides index recommendations and query improvement suggestions.

## Typical Workflow

A typical performance optimization workflow using these tools:

1. Use `get_most_expensive_queries` to identify resource-intensive queries
2. For each problematic query, use `suggest_query_optimizations` to get improvement recommendations
3. Analyze document structure with `analyze_document_structure` to understand the data model
4. Check for unused indexes with `get_indexes_to_drop` to clean up the index space
5. Use `get_system_indexes` to review current indexes and identify optimization opportunities
<!-- 6. Implement recommended indexes and query modifications
7. Monitor performance improvements using `get_longest_running_queries` and other tools -->

## Best Practices

- Regularly review the most expensive and longest-running queries
- Create optimal indexes based on actual query patterns
- Remove unused indexes to improve index maintenance time
- Use covering indexes for frequent queries when appropriate
- Ensure queries include appropriate LIMIT clauses to prevent excessive result sizes
- Monitor the database for queries that use primary indexes and optimize them

## Additional Resources

For more information on Couchbase SQL++ query optimization, refer to:

- [Couchbase Query Optimization Documentation](https://docs.couchbase.com/server/current/n1ql/n1ql-language-reference/index.html)
- [Couchbase Indexing Best Practices](https://docs.couchbase.com/server/current/learn/services-and-indexes/indexes/index-replication.html)
- [Couchbase Performance Tuning](https://docs.couchbase.com/server/current/performance/index-performance.html)

## Common Index Optimization Patterns

### 1. Equality Predicates

For queries with equality predicates:

```sql
SELECT * FROM `bucket`.`scope`.`collection` WHERE field = value
```

Create an index on the equality field:

```sql
CREATE INDEX idx_field ON `bucket`.`scope`.`collection`(field);
```

### 2. Range Queries

For queries with range predicates:

```sql
SELECT * FROM `bucket`.`scope`.`collection` WHERE field > value1 AND field < value2
```

Create an index on the range field:

```sql
CREATE INDEX idx_field_range ON `bucket`.`scope`.`collection`(field);
```

### 3. Sorting and Filtering

For queries that filter and sort:

```sql
SELECT * FROM `bucket`.`scope`.`collection` WHERE field1 = value ORDER BY field2
```

Create a composite index with the filter field first, then the sort field:

```sql
CREATE INDEX idx_field1_field2 ON `bucket`.`scope`.`collection`(field1, field2);
```

### 4. Covering Indexes

For queries where all fields are known:

```sql
SELECT field1, field2, field3 FROM `bucket`.`scope`.`collection` WHERE field4 = value
```

Create a covering index that includes both predicate and projected fields:

```sql
CREATE INDEX idx_covering ON `bucket`.`scope`.`collection`(field4) INCLUDE (field1, field2, field3);
```

## Interpreting Query Analysis Results

When using the query analysis tools, pay attention to these key metrics:

- **Execution Time**: The time taken to execute the query
- **Result Size**: The amount of data returned by the query
- **Result Count**: The number of documents returned by the query
- **Index Scan Count**: The number of index entries scanned
- **Document Fetch Count**: The number of documents fetched

High values in these metrics may indicate opportunities for optimization:

1. **High execution time + high index scan count**: Consider creating a more selective index
2. **High execution time + high document fetch count**: Consider a covering index
3. **High result size/count**: Add LIMIT clauses or pagination
4. **Using primary index scan**: Create specific indexes for the query predicates

## Troubleshooting Common Query Issues

### Slow Queries

If you have identified slow queries using `get_longest_running_queries`:

1. Use `suggest_query_optimizations` to get index recommendations
2. Create recommended indexes
3. Verify improvements with EXPLAIN
4. Monitor query performance with `get_completed_requests`

### Failed Queries

If you're seeing failed queries in `get_fatal_requests`:

1. Check for syntax errors
2. Verify index availability
3. Ensure appropriate permissions
4. Check for resource constraints (memory, concurrency limits)

### Large Result Sets

If `get_largest_result_size_queries` shows queries returning excessive data:

1. Add appropriate LIMIT clauses
2. Implement pagination
3. Refine query predicates to be more selective
4. Project only necessary fields instead of using SELECT *

## Performance Monitoring Best Practices

- Run `get_most_expensive_queries` weekly to identify trending performance issues
- After index changes, verify improvements with `get_completed_requests`
- Periodically check for unused indexes with `get_indexes_to_drop`
- For critical queries, set up regular monitoring with `get_completed_requests`
- Analyze new document structures before adding significant data
