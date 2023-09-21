//! How to start a NFT indexer.
//!
//! Can be run with `cargo run --example nft_indexer`.
//!
use anyhow::Result;
use arkproject::{nft_indexer, nft_storage::DefaultStorage};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialized any storage implementing the StorageManager trait.
    let storage = DefaultStorage::new();

    // TODO: the node URL can be passed here, we don't
    // have to rely on env variables in deeper libraries.
    // It will be harder to maintain and extend.

    // The main functions should load env variables. Libraries
    // should accept configuration parameters instead.
    // IndexerConfig or something like this, with all we need
    // to initialize internal stuff like Starknet client and
    // the block ranges.

    // Start the indexer using the storage.
    nft_indexer::main_loop(storage).await?;

    Ok(())
}
