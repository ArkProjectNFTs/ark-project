# ArkIndexer: Starknet Blockchain Indexing in Rust

`ArkIndexer` is a comprehensive Rust library crafted for extracting, processing, and indexing events from the Starknet blockchain.

## **Core Features**

- 🗃️ **Storage Management**: Efficiently manage, handle, and persist blockchain data.
- 🚀 **Event Processing**: Skillfully extract, reshape, and handle blockchain events.
- 🕵️ **Custom Observers**: Enrich your indexing with custom observer functionalities that offer real-time tracking and reporting.
- 🔍 **Tracing**: Get deeper insights with built-in logging and tracing, tailored for debugging and performance analytics.

## **Prerequisites**

Ensure you have the latest stable version of Rust installed.

## **Installation**

Embed `ark-rs` into your Rust project by updating your `Cargo.toml`:

```toml
[dependencies]
ark-rs = "0.1.0"
```

## **Example Usage**

For a hands-on demonstration of the indexer in action, check out the example at [examples/nft_indexer.rs](/examples/nft_indexer.rs).

```bash
cargo run --example nft_indexer
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


| Parameter   | Description                                                                                       |
|-------------|---------------------------------------------------------------------------------------------------|
| `from_block`| Specifies the starting block for indexing.                                                        |
| `to_block`  | Specifies the end block for indexing.                                                             |
| `force_mode`| A binary flag for forceful re-indexing. By default, cached blocks are skipped from re-processing. |



## Tests

To run the tests, use:

```bash
cargo test
```

## License

MIT License 