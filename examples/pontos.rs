//! How to start a NFT indexer.
//!
//! Can be run with `cargo run --example pontos`.
//!
use anyhow::Result;
use ark_starknet::client::{StarknetClient, StarknetClientHttp};
use arkproject::pontos::{
    event_handler::EventHandler, storage::types::*, storage::DefaultStorage, Pontos, PontosConfig,
};
use async_trait::async_trait;
use starknet::core::types::BlockId;
use std::sync::Arc;

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
        Arc::new(DefaultStorage::new("db.sqlite3").await.unwrap()),
        Arc::new(DefaultEventHandler::new()),
        config,
    ));

    let indexer = Arc::clone(&pontos);

    // let mut handles = vec![];
    // let do_force = false;

    // for i in 0..3 {
    //     let indexer = Arc::clone(&pontos);
    //     let handle = tokio::spawn(async move {
    //         let from = BlockId::Number(i + 1 * 10_000);
    //         let to = BlockId::Number(i + 1 * 10_000 + 100);
    //         println!("Indexer [{:?} - {:?}] started!", from, to);
    //         match indexer.index_block_range(from, to, do_force).await {
    //             Ok(_) => println!("Indexer [{:?} - {:?}] completed!", from, to),
    //             Err(e) => println!("Indexer [{:?} - {:?}] failed! [{:?}]", from, to, e),
    //         }
    //     });

    //     handles.push(handle);
    // }

    // futures::future::join_all(handles).await;

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
    async fn on_terminated(&self, _indexer_version: u64, _indexer_identifier: &str) {
        println!("pontos: process terminated");
    }

    async fn on_block_processed(
        &self,
        block_number: u64,
        indexer_version: u64,
        indexer_identifier: &str,
    ) {
        // TODO: here we want to call some storage if needed from an other object.
        // But it's totally unrelated to the core process, so we can do whatever we want here.
        println!(
            "pontos: block processed {} {} {}",
            block_number, indexer_version, indexer_identifier
        );
    }

    async fn on_token_registered(&self, token: TokenFromEvent) {
        println!("pontos: token registered {:?}", token);
    }

    async fn on_event_registered(&self, event: TokenEvent) {
        println!("pontos: event registered {:?}", event);
    }
}
