//! How to start a NFT indexer.
//!
//! Can be run with `cargo run --example nft_indexer`.
//!
use anyhow::Result;
use arkproject::pontos::{
    storage::DefaultStorage,
    storage::types::*,
    event_handler::EventHandler,
    Pontos, PontosConfig,
};
use starknet::core::types::{BlockId, BlockTag};
use ark_starknet::client::{StarknetClient, StarknetClientHttp};
use std::sync::Arc;
use async_trait::async_trait;

#[tokio::main]
async fn main() -> Result<()> {

    let client = Arc::new(
        StarknetClientHttp::new(
            "https://starknet-goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        )
            .unwrap(),
    );

    // Typically loaded from env.
    let config = PontosConfig {
        indexer_version: 1,
        indexer_identifier: "task_1234".to_string(),
    };

    let pontos = Arc::new(Pontos::new(
        Arc::clone(&client),
        Arc::new(DefaultStorage::new().await.unwrap()),
        Arc::new(DefaultEventHandler::new()),
        config,
    ));

    let mut handles = vec![];
    let do_force = false;

    for i in 0..3 {
        let indexer = Arc::clone(&pontos);
        let handle = tokio::spawn(async move {
            let from = BlockId::Number(i * 10_000);
            let to = BlockId::Number(i * 10_000 + 100);
            println!("Indexer [{:?} - {:?}] started!", from, to);
            match indexer.index_block_range(from, to, do_force).await {
                Ok(_) => println!("Indexer [{:?} - {:?}] completed!", from, to),
                Err(e) => println!("Indexer [{:?} - {:?}] failed! [{:?}]", from, to, e),
            }
        });

        handles.push(handle);
    }

    futures::future::join_all(handles).await;

    Ok(())
}

// Default event hanlder.
struct DefaultEventHandler;

impl DefaultEventHandler {
    pub fn new() -> Self {
        DefaultEventHandler {}
    }
}

#[async_trait]
impl EventHandler for DefaultEventHandler {
    async fn on_terminated(&self) {
        println!("pontos: process terminated");
    }

    async fn on_block_processed(&self, block_number: u64) {
        println!("pontos: block processed {:?}", block_number);
    }

    async fn on_token_registered(&self, token: TokenFromEvent) {
        println!("pontos: token registered {:?}", token);
    }

    async fn on_event_registered(&self, event: TokenEvent) {
        println!("pontos: event registered {:?}", event);
    }

}
