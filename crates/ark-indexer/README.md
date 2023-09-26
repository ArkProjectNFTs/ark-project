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

Add imports 

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
indexer.run();
```

#### Parameters

**start_block**: Specifies the starting block for indexing. In the example, it is provided as BlockId::Number(START_BLOCK). The START_BLOCK is a placeholder and needs to be replaced with the actual starting block number.

**end_block**: Specifies the end block for indexing. In the example, it's given as BlockId::Number(END_BLOCK). The END_BLOCK is a placeholder and should be replaced with the actual ending block number.

**force_mode**: A mode (represented by the placeholder FORCE_MODE) which is likely a boolean or an enumeration. Its specific behavior isn't detailed in the README, but usually "force" modes in software are used to override certain default behaviors or checks.


## Tests

To run the tests, use:

```bash
cargo test
```

## License

MIT License 