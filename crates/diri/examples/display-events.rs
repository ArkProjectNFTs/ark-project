use anyhow::Result;
use async_trait::async_trait;
use diri::event_handler::EventHandler;
use diri::storage::types::CancelledData;
use diri::storage::types::ExecutedData;
use diri::storage::types::FulfilledData;
use diri::storage::types::PlacedData;
use diri::storage::types::RollbackStatusData;
use diri::storage::Storage;
use diri::storage::StorageResult;
use diri::Diri;
use dotenv::dotenv;
use starknet::core::types::BlockId;
use starknet::providers::jsonrpc::HttpTransport;
use starknet::providers::AnyProvider;
use starknet::providers::JsonRpcClient;
use starknet::providers::Provider;
use url::Url;

use std::{env, sync::Arc};

use tracing::{error, info, trace, warn};
use tracing_subscriber::fmt;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();

    init_logging();

    info!("Starting.....!");

    let rpc_url = env::var("STARKNET_RPC").expect("STARKNET_RPC not set");
    let rpc_url_converted = Url::parse(&rpc_url).unwrap();

    let provider = Arc::new(AnyProvider::JsonRpcHttp(JsonRpcClient::new(
        HttpTransport::new(rpc_url_converted.clone()),
    )));

    let storage = FakeStorage {};
    let handler = DefaultEventHandler {};

    let indexer = Arc::new(Diri::new(
        provider.clone(),
        Arc::new(storage),
        Arc::new(handler),
    ));

    let sleep_msecs = match env::var("SLEEP_PERIOD") {
        Ok(s) => s
            .parse::<u64>()
            .expect("Failed to parse SLEEP_PERIOD as u64"),
        Err(_) => 500,
    };
    let mut from = match env::var("BLOCK_START") {
        Ok(s) => s
            .parse::<u64>()
            .expect("Failed to parse BLOCK_START as u64"),
        Err(_) => 0,
    };
    let range = match env::var("BLOCK_RANGE") {
        Ok(s) => s
            .parse::<u64>()
            .expect("Failed to parse BLOCK_RANGE as u64"),
        Err(_) => 0,
    };

    // Set to None to keep polling the head of chain.
    let to = match env::var("BLOCK_END") {
        Ok(s) => Some(s.parse::<u64>().expect("Failed to parse BLOCK_END as u64")),
        Err(_) => None,
    };

    info!(
        "Starting arkchain indexer: from:{} to:{:?} range:{}",
        from, to, range,
    );

    loop {
        let latest_block = match provider.block_number().await {
            Ok(block_number) => block_number,
            Err(e) => {
                error!("Can't get arkchain block number: {}", e);
                tokio::time::sleep(tokio::time::Duration::from_millis(sleep_msecs)).await;
                continue;
            }
        };

        trace!("Latest block {latest_block} (from={from})");

        let start = from;
        let mut end = std::cmp::min(from + range, latest_block);
        if let Some(to) = to {
            if end > to {
                end = to
            }
        }

        if start > end {
            trace!("Nothing to fetch at block {start}");
            tokio::time::sleep(tokio::time::Duration::from_millis(sleep_msecs)).await;
            continue;
        }

        trace!("Fetching blocks {start} - {end}");
        match indexer
            .index_block_range(BlockId::Number(start), BlockId::Number(end))
            .await
        {
            Ok(_) => {
                trace!("Blocks successfully indexed");

                if let Some(to) = to {
                    if end >= to {
                        trace!("`to` block was reached, exit.");
                        return Ok(());
                    }
                }

                // +1 to not re-index the end block.
                from = end + 1;
            }
            Err(e) => {
                error!("Blocks indexing error: {}", e);

                // TODO: for now, any failure on the block range, we skip it.
                // Can be changed as needed.
                warn!("Skipping blocks range: {} - {}", start, end);
                from = end + 1;
            }
        };

        tokio::time::sleep(tokio::time::Duration::from_millis(sleep_msecs)).await;
    }
}

/// Initializes the logging, ensuring that the `RUST_LOG` environment
/// variable is always considered first.
fn init_logging() {
    const DEFAULT_LOG_FILTER: &str = "info,diri=trace";

    tracing::subscriber::set_global_default(
        fmt::Subscriber::builder()
            .with_env_filter(
                EnvFilter::try_from_default_env()
                    .or(EnvFilter::try_new(DEFAULT_LOG_FILTER))
                    .expect("Invalid RUST_LOG filters"),
            )
            .finish(),
    )
    .expect("Failed to set the global tracing subscriber");
}

struct FakeStorage;

#[async_trait]
impl Storage for FakeStorage {
    async fn register_placed(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &PlacedData,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn register_cancelled(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &CancelledData,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn register_fulfilled(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &FulfilledData,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn register_executed(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &ExecutedData,
    ) -> StorageResult<()> {
        Ok(())
    }

    async fn status_back_to_open(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &RollbackStatusData,
    ) -> StorageResult<()> {
        Ok(())
    }
}

struct DefaultEventHandler;

#[async_trait]
impl EventHandler for DefaultEventHandler {
    async fn on_block_processed(&self, block_number: u64) {
        info!("event: block processed {:?}", block_number);
    }
}
