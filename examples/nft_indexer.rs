//! How to start a NFT indexer.
//!
//! This example demonstrates the steps and components required to set up 
//! and run the NFT indexer using the `ark_rs` library. 
//!
//! Can be run with `cargo run --example nft_indexer`.

use anyhow::Result;
use ark_rs::nft_indexer::{ArkIndexer, ArkIndexerArgs, DefaultIndexerObserver};
use ark_rs::nft_storage::DefaultStorage;
use ark_starknet::client::{StarknetClient, StarknetClientHttp};
use starknet::core::types::BlockId;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize a default storage solution for the indexer.
    let storage = Arc::new(DefaultStorage::new());

    // Set up the Starknet client with the given endpoint. This client will interact with
    // the Starknet blockchain.
    let client = Arc::new(
        StarknetClientHttp::new(
            "https://starknet-goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        )
        .unwrap(),
    );

    // Initialize the NFT indexer with the created storage, client, and a default observer.
    // The ArkIndexerArgs provides metadata about this particular indexer instance.
    ArkIndexer::new(
        storage,
        client,
        Arc::new(DefaultIndexerObserver::default()),
        ArkIndexerArgs {
            indexer_version: 1,
            indexer_identifier: String::from("main"),
        },
    )
    // The `run` function starts the indexing process. 
    // The arguments represent the start block, end block, and force mode respectively.
    .run(BlockId::Number(5000), BlockId::Number(5001), false)
    .await?;

    Ok(())
}