## Sana

Sana is a library that is designed to index NFTs on Starknet in the most generic manner, but still being configurable.

## Overview

The indexation process is made by the code inside `lib.rs`, with two principal functions:

1. `index_pending` to index the pending block and the latest once the pending block is validated.
2. `index_block_range` to index a range of given block.

During the indexation process, Sana relies on two mecanisms that can be fully customized, by implementing those two traits:

1. First, a `Storage` trait that you can derive to decide how to store the data that will be gathered by Sana on chain. You can find an example using with `sqlx` (Sqlite, Postgres, MySql compatible) in the `storage/sqlx` module.
2. Second, you can initialize a new Sana instance with an `EventHandler`, which are events that Sana will emit without directly being associated with a `Storage`.

## Code organization

Sana is organized the following way:

1. `lib.rs` contains the main logic and types related to Sana.
2. `managers`: to split the processing logic of each part of the indexing process, Sana has several `managers` that implement the logic and data processing associated with the data to index. The main managers are `token`, `event`, `contract` and `block`.
3. `storage`: the storage module with definition of the types related to any database store. Implementing the `Storage` trait you will receive the data emitted from Sana. The data that Sana passes to the storage are voluntarily agnostic of Starknet, to ensure any database system without prior knowledge of Starknet types can handle the data.
4. Metadata are separated from Sana as they don't belong to the core indexing logic and are not essential for a good indexaction of the contracts and tokens.

## Sana usage

Sana is part of the `arkproject` crate, and can be imported as follow:

```rust
use arkproject::sana::...
```

You can find examples of Sana usages in the examples:

- `examples/sana.rs`: a simple example without any database, to see how a range of block can be indexed.
- `examples/sana_pending.rs`: an example without any database, to illustrate how to index the head of the chain.
- `examples/sana_sqlx.rs`: an example using the default storage implementation of `sqlx`, with in-memory Sqlite.
