//! How to use Diri library.
//!
//! Can be run with `cargo run --example diri`.
//!
use anyhow::Result;
use arkproject::{
    diri::{event_handler::EventHandler, storage::*, Diri},
    starknet::client::{StarknetClient, StarknetClientHttp},
};
use async_trait::async_trait;
use starknet::core::types::BlockId;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<()> {
    let client = StarknetClientHttp::new("http://127.0.0.1:7070").unwrap();
    let storage = DefaultStorage {};
    let handler = DefaultEventHandler {};

    // Here, we can define any logic we want to index blocks range etc..
    // We can then use the same reference across threads to work with only one
    // ArkchainIndexer instance.
    let indexer = Arc::new(Diri::new(
        Arc::new(client),
        Arc::new(storage),
        Arc::new(handler),
    ));

    let mut handles = vec![];

    for i in 0..3 {
        let indexer = Arc::clone(&indexer);
        let handle = tokio::spawn(async move {
            let from = BlockId::Number(i * 10);
            let to = BlockId::Number(i * 10 + 5);
            println!("Indexer [{:?} - {:?}] started!", from, to);
            match indexer.index_block_range(from, to).await {
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

#[async_trait]
impl EventHandler for DefaultEventHandler {
    async fn on_block_processed(&self, block_number: u64) {
        println!("event: block processed {:?}", block_number);
    }

    async fn on_broker_registered(&self, _broker: BrokerData) {
        // do nothing.
    }

    async fn on_order_listing_added(&self, order: OrderListingData) {
        println!("event: order listing added {:?}", order);
    }

    async fn on_order_buy_executed(&self, order: OrderBuyExecutingData) {
        println!("event: order buy executed {:?}", order);
    }

    async fn on_order_finalized(&self, order: OrderFinalizedData) {
        println!("event: order finalized {:?}", order);
    }
}

// Default storage that logs stuff, implementing the Storage trait.
struct DefaultStorage;

#[async_trait]
impl Storage for DefaultStorage {
    async fn register_broker(&self, broker: BrokerData) -> StorageResult<()> {
        println!("\n*** register broker\n{:?}", broker);
        Ok(())
    }

    async fn add_listing_order(&self, order: OrderListingData) -> StorageResult<()> {
        println!("\n*** add listing order \n{:?}", order);
        Ok(())
    }

    async fn set_order_buy_executing(&self, order: OrderBuyExecutingData) -> StorageResult<()> {
        println!("\n*** buy executing order \n{:?}", order);
        Ok(())
    }

    async fn set_order_finalized(&self, order: OrderFinalizedData) -> StorageResult<()> {
        println!("\n*** order finalized \n{:?}", order);
        Ok(())
    }
}
