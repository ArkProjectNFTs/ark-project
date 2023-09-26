# ark-rs 🦀

## Overview
Rust libraries and binaries related to the ArkProject.

This library aims at providing the building block
and functionalities for the Starknet community in
order to work with NFTs.

## Architecture

The indexation of NFTs is at the moment a challenge on Starknet
due to the standards being in progress.

To propose a flexible and evolutive approach, `ark-rs` provides
the following crates:

### - Storage

By defining generic interface for the storage, we reduce the coupling
between backend implementation and indexer requirements.
To run, the indexer only needs an implementation of `StorageManager` to
access/store NFTs data.

This is what `storage` crate provides. You can find a basic storage implementation based on SQL-Lite,
but you may write your own by simply implementing `StorageManager` trait.

### - Indexer

The index logic is usually the same for all NFTs. Gathering the events first,
to then identify the contract and tokens associated to the event.
The `indexer` crate provide a `main_loop` with this logic, for an efficient
indexation per blocks.

### - [Metadata](/crates/ark-metadata/README.md)

Even if the metadata are not at the core of the indexing process, they are
vital for any NFT ecosystem.
The `metadata` crate aims at providing basic functions to work with normalized metadata.
In the current design, this crate totally separated from the indexation loop as it can be massively optimized elsewhere.

### - Starknet

To work, the indexer interacts with Starknet. The `starknet` crate provides
an epurated Starknet provider interface to get the job done.


## Features

- Indexer logic for Starknet NFT
- Indexer for arkchain orderbook
- Generic storage for indexer data with SQL-lite
- NFT Metadata manager interface

## Quick start

Examples are available in the `example` folder.
They can be run with the following command:
```
RUST_LOG="ark=trace,storage=trace" cargo run --example nft_indexer
```

To work on a specific package:
```
cargo build -p <package>
```
