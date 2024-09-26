use anyhow::Result;
use async_trait::async_trait;
use clap::Parser;
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
use serde::ser::SerializeStruct;
use serde::Serialize;
use starknet::core::types::BlockId;
use starknet::providers::jsonrpc::HttpTransport;
use starknet::providers::AnyProvider;
use starknet::providers::JsonRpcClient;
use starknet::providers::Provider;
use url::Url;

use std::fs::File;
use std::sync::atomic::AtomicU64;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::sync::Mutex;

use tracing::{error, info, trace, warn};
use tracing_subscriber::fmt;
use tracing_subscriber::EnvFilter;

#[derive(Parser, Debug)]
#[clap(about = "display-events")]
struct Args {
    #[clap(long, help = "Starknet RPC", env = "STARKNET_RPC")]
    rpc: String,

    #[clap(long, help = "Sleep period in milliseconds", default_value = "500")]
    sleep_msecs: u64,

    #[clap(
        long,
        help = "Starting block number",
        env = "BLOCK_START",
        default_value = "0"
    )]
    block_start: u64,

    #[clap(long, help = "Ending block number", env = "BLOCK_END")]
    block_end: Option<u64>,

    #[clap(long, help = "Block range", env = "BLOCK_RANGE", default_value = "0")]
    block_range: u64,

    #[clap(long, help = "Nb limit of retries")]
    limit_wait_retries: Option<u64>,

    #[clap(long, help = "JSON output", env = "JSON_OUTPUT")]
    output: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();

    let args = Args::parse();

    init_logging();

    let rpc_url = args.rpc;
    let rpc_url_converted = Url::parse(&rpc_url).unwrap();

    let provider = Arc::new(AnyProvider::JsonRpcHttp(JsonRpcClient::new(
        HttpTransport::new(rpc_url_converted.clone()),
    )));

    let sleep_msecs = args.sleep_msecs;
    let mut from = args.block_start;
    let range = args.block_range;

    // Set to None to keep polling the head of chain.
    let to = args.block_end;
    let limit_wait_retries = args.limit_wait_retries;
    let mut nb_retries = 0_u64;

    info!("Starting.....!");

    let storage = Arc::new(JSONStorage::new(args.output, from));

    let handler = DefaultEventHandler {};

    let indexer = Arc::new(Diri::new(
        provider.clone(),
        storage.clone(),
        Arc::new(handler),
    ));

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
            if let Some(limit_wait_retries) = limit_wait_retries {
                if nb_retries > limit_wait_retries {
                    info!("Wait limit reached");
                    storage.end.store(latest_block, Ordering::SeqCst);
                    break;
                }
                nb_retries += 1;
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(sleep_msecs)).await;
            continue;
        }
        nb_retries = 0;
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
                        storage.end.store(end, Ordering::SeqCst);
                        break;
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
    storage.write();
    Ok(())
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

#[derive(Clone, Debug)]
enum OrderbookEventType {
    Placed(PlacedData),
    Cancelled(CancelledData),
    Fulfilled(FulfilledData),
    Executed(ExecutedData),
    RollbackStatus(RollbackStatusData),
}

struct SerializablePlacedData(PlacedData);
struct SerializableCancelledData(CancelledData);
struct SerializableFulfilledData(FulfilledData);
struct SerializableExecutedData(ExecutedData);
struct SerializableRollbackStatus(RollbackStatusData);

impl Serialize for SerializablePlacedData {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("data", 9)?;
        state.serialize_field("order_hash", &self.0.order_hash)?;
        state.serialize_field("order_type", &self.0.order_type)?;
        state.serialize_field("broker_id", &self.0.broker_id)?;
        state.serialize_field("offerer", &self.0.offerer)?;
        state.serialize_field("token_address", &self.0.token_address)?;
        state.serialize_field("token_id", &self.0.token_id)?;
        state.serialize_field("quantity", &self.0.quantity)?;
        state.serialize_field("start_amount", &self.0.start_amount)?;
        state.serialize_field("end_amount", &self.0.end_amount)?;
        state.end()
    }
}

impl Serialize for SerializableCancelledData {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("data", 3)?;
        state.serialize_field("order_hash", &self.0.order_hash)?;
        state.serialize_field("order_type", &self.0.order_type)?;
        state.serialize_field("reason", &self.0.reason)?;
        state.end()
    }
}

impl Serialize for SerializableFulfilledData {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("data", 4)?;
        state.serialize_field("order_hash", &self.0.order_hash)?;
        state.serialize_field("order_type", &self.0.order_type)?;
        state.serialize_field("fulfiller", &self.0.fulfiller)?;
        state.serialize_field("related_order_hash", &self.0.related_order_hash)?;
        state.end()
    }
}

impl Serialize for SerializableExecutedData {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("data", 4)?;
        state.serialize_field("order_hash", &self.0.order_hash)?;
        state.serialize_field("order_type", &self.0.order_type)?;
        state.serialize_field("from", &self.0.from)?;
        state.serialize_field("to", &self.0.to)?;
        state.end()
    }
}

impl Serialize for SerializableRollbackStatus {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("data", 3)?;
        state.serialize_field("order_hash", &self.0.order_hash)?;
        state.serialize_field("order_type", &self.0.order_type)?;
        state.serialize_field("reason", &self.0.reason)?;
        state.end()
    }
}

impl Serialize for OrderbookEventType {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let type_key = "type";
        let data_key = "data";

        let mut state = serializer.serialize_struct("event", 2)?;
        match self {
            OrderbookEventType::Placed(data) => {
                state.serialize_field(type_key, "PLACED")?;
                state.serialize_field(data_key, &SerializablePlacedData(data.clone()))?;
            }
            OrderbookEventType::Cancelled(data) => {
                state.serialize_field(type_key, "CANCELLED")?;
                state.serialize_field(data_key, &SerializableCancelledData(data.clone()))?;
            }
            OrderbookEventType::Fulfilled(data) => {
                state.serialize_field(type_key, "FULFILLED")?;
                state.serialize_field(data_key, &SerializableFulfilledData(data.clone()))?;
            }
            OrderbookEventType::Executed(data) => {
                state.serialize_field(type_key, "EXECUTED")?;
                state.serialize_field(data_key, &SerializableExecutedData(data.clone()))?;
            }
            OrderbookEventType::RollbackStatus(data) => {
                state.serialize_field(type_key, "ROLLBACK")?;
                state.serialize_field(data_key, &SerializableRollbackStatus(data.clone()))?;
            }
        };
        state.end()
    }
}

#[derive(Clone, Serialize, Debug)]
struct OrderbookEvent {
    #[serde(rename = "event")]
    event_type: OrderbookEventType,
    block_id: u64,
    block_timestamp: u64,
}

#[derive(Serialize, Debug)]
struct JSONStorage {
    start: u64,
    end: AtomicU64,
    #[serde(skip)]
    output: Option<String>,
    events: Mutex<Vec<OrderbookEvent>>,
}

impl JSONStorage {
    fn new(output: Option<String>, start: u64) -> Self {
        Self {
            output,
            start,
            end: AtomicU64::new(0),
            events: Mutex::new(Vec::new()),
        }
    }

    fn write(&self) {
        if self.output.is_none() {
            println!("{}", serde_json::to_string_pretty(self).unwrap());
        } else {
            let mut file = File::create(self.output.clone().unwrap()).unwrap();
            serde_json::to_writer_pretty(&mut file, &self).unwrap();
        }
    }
}

#[async_trait]
impl Storage for JSONStorage {
    async fn register_placed(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &PlacedData,
    ) -> StorageResult<()> {
        trace!("PLACED {} {:?}", block_id, order);
        if let Ok(mut events) = self.events.lock() {
            events.push(OrderbookEvent {
                block_id,
                block_timestamp,
                event_type: OrderbookEventType::Placed(order.clone()),
            });
        } else {
            error!("Failed to append Placed event");
        }
        Ok(())
    }

    async fn register_cancelled(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &CancelledData,
    ) -> StorageResult<()> {
        trace!("CANCELLED {} {:?}", block_id, order);
        if let Ok(mut events) = self.events.lock() {
            events.push(OrderbookEvent {
                block_id,
                block_timestamp,
                event_type: OrderbookEventType::Cancelled(order.clone()),
            });
        } else {
            error!("Failed to append Cancelled event");
        }
        Ok(())
    }

    async fn register_fulfilled(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &FulfilledData,
    ) -> StorageResult<()> {
        trace!("FULFILLED {} {:?}", block_id, order);
        if let Ok(mut events) = self.events.lock() {
            events.push(OrderbookEvent {
                block_id,
                block_timestamp,
                event_type: OrderbookEventType::Fulfilled(order.clone()),
            });
        } else {
            error!("Failed to append Fulfilled event");
        }
        Ok(())
    }

    async fn register_executed(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &ExecutedData,
    ) -> StorageResult<()> {
        trace!("EXECUTED {} {:?}", block_id, order);
        if let Ok(mut events) = self.events.lock() {
            events.push(OrderbookEvent {
                block_id,
                block_timestamp,
                event_type: OrderbookEventType::Executed(order.clone()),
            });
        } else {
            error!("Failed to append Executed event");
        }
        Ok(())
    }

    async fn status_back_to_open(
        &self,
        block_id: u64,
        block_timestamp: u64,
        order: &RollbackStatusData,
    ) -> StorageResult<()> {
        trace!("ROLLBACK {} {:?}", block_id, order);
        if let Ok(mut events) = self.events.lock() {
            events.push(OrderbookEvent {
                block_id,
                block_timestamp,
                event_type: OrderbookEventType::RollbackStatus(order.clone()),
            });
        } else {
            error!("Failed to append Executed event");
        }
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
