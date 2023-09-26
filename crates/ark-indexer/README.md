# ArkIndexer

ArkIndexer is a Rust library designed to interact with, process, and index events from the Starknet blockchain.

## Features

- **Storage Management**: Seamlessly handle and store data.
- **Event Processing**: Extract, format, and process blockchain events.
- **Custom Observers**: Integrate custom observer functionalities to track and report on the indexing progress.
- **Tracing**: Built-in logging and tracing mechanisms for better debugging and performance insights.

## Prerequisites

- Rust (latest stable version recommended)

## Installation

Add the following to your `Cargo.toml`:

```toml
[dependencies]
ark-rs = "0.1.0"
```

## Quick Start

Import Necessary Modules:

```rust
use ark_rs::{
    nft_indexer::{ArkIndexer, ArkIndexerArgs, DefaultIndexerObserver},
    nft_storage::DefaultStorage,
    ark_starknet::{
        client::StarknetClientHttp,
        core::types::BlockId,
    }
};
use std::sync::Arc;
```

Initialize the storage, client, and observer:

```rust
let storage = Arc::new(DefaultStorage::new());
let client = Arc::new(StarknetClientHttp::new("YOUR_ENDPOINT_HERE").unwrap());
let observer = Arc::new(DefaultIndexerObserver::default());
```

### Create an instance of the ArkIndexer:

```rust
let indexer_args = ArkIndexerArgs {
    indexer_version: 1,
    indexer_identifier: String::from("main"),
};
let indexer = ArkIndexer::new(storage, client, observer, indexer_args);
```

### Run the indexer

```rust
indexer.run(/* parameters */);
```

#### Parameters

**from_block**: Specifies the starting block for indexing.

**to_block**: Specifies the end block for indexing.

**force_mode**: A binary flag that dictates whether to forcibly re-index. By default, previously indexed blocks are cached and not processed again.


## Tests

To run the tests, use:

```bash
cargo test
```

## License

MIT License 