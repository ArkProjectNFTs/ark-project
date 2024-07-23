a# Performance task to do and code review to fix

## About 
This document aims to product a better performance inside ark-indexer-marketplace project. 
All of the recomandation here should lead to performance improvements reducing lattency issues and ingestion congestion. 

## Current State

![Flamegraph](./flamegraph.svg)

## Table of Content 

### - main.rs - l22 -  Change The Memory default Alocator 
#### Report
Using the jmaloc leads to better performance in our case than the use of the default glibc allocator (that rust use by default)
#### Reference 
https://github.com/rust-lang/rust-analyzer/issues/1441
#### Fix - Install
```bash
cargo add tikv_jemallocator
```
#### Fix - Implementation
Before the main function 
```rust
#[global_allocator]
static GLOBAL: tikv_jemallocator::Jemalloc = tikv_jemallocator::Jemalloc;
```

### - managers/block_manager.rs - l22 -  Change String to &str
#### Report
Using string is the same as using a vector of u8, it implies copy over ref passing, using u8 point directly to a memory adress ( performance improvement )
#### Fix - Implementation
Before the main function 
```rust
    pub async fn set_block_info(
        &self,
        block_number: u64,
        block_timestamp: u64,
        indexer_version: &'str,
        indexer_identifier: &'str,
        block_status: BlockIndexingStatus,
    ) -> Result<(), StorageError> {
```

### - managers/block_manager.rs - l35 -  Cunused variable + string usage
#### Report
The variable following variable is unused: indexer_version
Using string is the same as using a vector of u8, it implies copy over ref passing, using u8 point directly to a memory adress ( performance improvement )
#### Fix - Implementation
remove indexer_version
or if you wish to keep the variable 
```rust
_indexer_version: &str,
```

### - managers/block_manager.rs - l85-86 -  Change String to &str
#### Report
Using string is the same as using a vector of u8, it implies copy over ref passing, using u8 point directly to a memory adress ( performance improvement )
#### Fix - Implementation
Before the main function 
```rust
    pub async fn set_block_info(
        &self,
        block_number: u64,
        block_timestamp: u64,
        indexer_version: &'str,
        indexer_identifier: &'str,
        block_status: BlockIndexingStatus,
    ) -> Result<(), StorageError> {
```

### - storage/sqlx/types.rs - l85-86 ALL -  Change String to &str
#### Report
Using string is the same as using a vector of u8, it implies copy over ref passing, using u8 point directly to a memory adress ( performance improvement )
The fix example should be apply to all file.
#### Fix - Implementation
Before the main function 
```rust
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct TokenData<'a> {
    pub contract_address: &'a str,
    pub chain_id: &'a str,
    pub token_id: &'a str,
}
```

### - storage/sqlx/utils.rs - l1 -  Change String to &str
#### Report
At least change the function definition -> the return value could be a string but it's not optimal
#### Fix - Implementation
Before the main function 
```rust
pub fn format_token_id(token_id: &str) -> &str {
    format!("{:0>width$}", token_id, width = 78).as_str()
}
```

## Conclusions
#### Report
A lot of modifications should be done on this library
It needs a deep rework inside logic especialy on format_element_sale_event on event_manager where hex could be done before the construction of the Object of the struct in response. 
It will require 2-3 days in order to fix the main problems that lead to performance issues.
