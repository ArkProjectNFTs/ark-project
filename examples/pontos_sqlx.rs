//! How to start a NFT indexer.
//!
//! Can be run with `cargo run --example pontos`.
//!
use anyhow::Result;
use ark_starknet::client::{StarknetClient, StarknetClientHttp};
use arkproject::pontos::{
    event_handler::EventHandler, storage::types::*, storage::DefaultSqlxStorage, Pontos,
    PontosConfig,
};
use async_trait::async_trait;
use starknet::core::types::BlockId;
use std::sync::Arc;

use tracing_subscriber::{fmt, layer::SubscriberExt, EnvFilter, Registry};

#[tokio::main]
async fn main() -> Result<()> {
    sqlx::any::install_default_drivers();

    tracing_log::LogTracer::init().expect("Setting log tracer failed.");
    // Create the layers
    let env_filter = EnvFilter::from_default_env();
    let fmt_layer = fmt::layer();

    // Combine layers and set as global default
    let subscriber = Registry::default().with(env_filter).with(fmt_layer);

    tracing::subscriber::set_global_default(subscriber)
        .expect("Setting default subscriber failed.");

    let client = Arc::new(
        StarknetClientHttp::new(
            "https://starknet-goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        )
        .unwrap(),
    );

    // Typically loaded from env.
    let config = PontosConfig {
        indexer_version: String::from("0.0.1"),
        indexer_identifier: "task_1234".to_string(),
    };

    let storage = Arc::new(DefaultSqlxStorage::new_any("sqlite::memory:").await?);

    sqlx::migrate!("./crates/pontos/src/storage/sqlx/migrations")
        .run(storage.get_pool_ref())
        .await?;

    let pontos = Arc::new(Pontos::new(
        Arc::clone(&client),
        Arc::clone(&storage),
        Arc::new(DefaultEventHandler::new()),
        config,
    ));

    let from = BlockId::Number(885_172);
    let to = BlockId::Number(885_180);
    let do_force = false;
    println!("Indexer [{:?} - {:?}] started!", from, to);

    match pontos.index_block_range(from, to, do_force).await {
        Ok(_) => {
            storage.dump_tables().await.unwrap();
            println!("Pontos task completed!");
        }
        Err(e) => println!("Pontos task failed! [{:?}]", e),
    }

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
    async fn on_terminated(&self, block_number: u64, indexation_progress: f64) {
        println!(
            "pontos: block processed: block_number={}, indexation_progress={}",
            block_number, indexation_progress
        );
    }

    async fn on_block_processing(&self, block_number: u64) {
        // TODO: here we want to call some storage if needed from an other object.
        // But it's totally unrelated to the core process, so we can do whatever we want here.
        println!("pontos: processing block: block_number={}", block_number);
    }

    async fn on_token_registered(&self, token: TokenInfo) {
        println!("pontos: token registered {:?}", token);
    }

    async fn on_event_registered(&self, event: TokenEvent) {
        println!("pontos: event registered {:?}", event);
    }
}
