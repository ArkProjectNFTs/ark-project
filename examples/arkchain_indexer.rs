//! How to use arkchain indexer library.
//!
//! Can be run with `cargo run --example arkchain_indexer`.
//!
use anyhow::Result;
use arkproject::{
    arkchain::{storage::*, ArkchainIndexer},
    starknet::client::{StarknetClient, StarknetClientHttp},
};
use async_trait::async_trait;
use starknet::core::types::BlockId;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<()> {
    let client = StarknetClientHttp::new("http://127.0.0.1:7070").unwrap();
    let storage = DefaultStorage {};

    // Here, we can define any logic we want to index blocks range etc..
    // We can then use the same reference across threads to work with only one
    // ArkchainIndexer instance.
    let indexer = Arc::new(ArkchainIndexer::new(Arc::new(client), Arc::new(storage)));

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

// Default storate that logs stuff.
struct DefaultStorage;

#[async_trait]
impl ArkchainStorage for DefaultStorage {
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
