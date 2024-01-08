# arkproject in 🦀🦀

## Overview

Rust libraries and binaries related to the ArkProject.

This library aims at providing the building block
and functionalities for the Starknet community in
order to work with NFTs.

## Architecture

The indexation of NFTs is at the moment a challenge on Starknet
due to the standards being in progress.

To propose a flexible and evolutive approach, `arkproject` provides
several crates to modularize the process.

### - Pontos

Pontos is an NFT indexer library for Starknet.
By defining a core process, Pontos is highly extensible using it's two traits:

`StorageManager`: This trait exposes all the functions that Pontos uses to
access/store data required for the indexation.

`EventHandler`: During the core process of Pontos, some events may be
interesting to be handled by external code, without modifying the core
code of Pontos. You can impl this trait to react on each event emitted
by Pontos.

### - [Metadata](/crates/ark-metadata/README.md)

Even if the metadata are not at the core of the indexing process, they are
vital for any NFT ecosystem.
The `metadata` crate aims at providing basic functions to work with normalized metadata.
In the current design, this crate totally separated from the indexation loop as it can be massively optimized elsewhere.

### - Starknet

To work, the indexer must interact with Starknet. The `starknet` crate provides
an epurated Starknet provider interface required by indexers and utilitary functions
related to Starknet types.

### - Solis

Solis is the sequencer that powers the Arkchain, where the decentralized orderbook lives.
For now Solis is not decentralizable, but it will be.

Solis is for now based on Katana from [Dojo](https://www.dojoengine.org/en/) project.
To run Solis, `cargo run -p solis`.

### - Diri

Diri is an indexer library for Solis and the Arkchain smart contracts.
As Pontos, Diri defines a core logic that can be configured using the two following traits:

`StorageManager`: This trait exposes all the functions that Diri uses to
access/store data required for the indexation.

`EventHandler`: During the core process of Diri, some events may be
interesting to be handled by external code, without modifying the core
code of Diri. You can impl this trait to react on each event emitted
by Diri.

## Features

- Indexer logic for Starknet NFT
- Indexer for arkchain orderbook
- Generic storage for indexer data with SQL-lite
- NFT Metadata manager interface

## Quick start

Examples are available in the `example` folder.
They can be run with the following command:

```
RUST_LOG="ark=trace,storage=trace" cargo run --example diri
```

To work on a specific package:

```
cargo build -p <package>
```

## License

Ark Project is licensed under the [Apache License](./LICENCE).
