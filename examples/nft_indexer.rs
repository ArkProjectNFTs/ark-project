//! How to start a NFT indexer.
//!
//! Can be run with `cargo run --example nft_indexer`.
//!
use anyhow::Result;
use ark_rs::nft_indexer::{ArkIndexer, ArkIndexerArgs};
use ark_rs::nft_storage::DefaultStorage;
use starknet::core::types::BlockId;

#[tokio::main]
async fn main() -> Result<()> {
    let storage = DefaultStorage::new();

    ArkIndexer::new(
        &storage,
        ArkIndexerArgs {
            rpc_provider: String::from(
                "https://starknet-goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
            ),
            indexer_version: 1,
            indexer_identifier: String::from("main"),
            from_block: BlockId::Number(5000),
            to_block: BlockId::Number(6000),
        },
    )
    .run()
    .await?;

    Ok(())
}
