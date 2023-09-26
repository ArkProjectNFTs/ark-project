//! How to start a NFT indexer.
//!
//! Can be run with `cargo run --example nft_indexer`.
//!
use anyhow::Result;
use ark_rs::nft_indexer::{ArkIndexer, ArkIndexerArgs};
use ark_rs::nft_storage::DefaultStorage;
use ark_starknet::client::{StarknetClient, StarknetClientHttp};
use starknet::core::types::BlockId;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<()> {
    let storage = Arc::new(DefaultStorage::new());
    let client = Arc::new(StarknetClientHttp::new(
        "https://starknet-goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    ).unwrap());

    ArkIndexer::new(
        storage,
        client,
        ArkIndexerArgs {
            indexer_version: 1,
            indexer_identifier: String::from("main")
        },
    )
    .run(BlockId::Number(5000), BlockId::Number(6000), false) // start, end, force_mode
    .await?;


    

    Ok(())
}
