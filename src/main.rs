mod constants;
mod core;
mod utils;
use std::env;

use crate::core::block::process_blocks_continuously;
use anyhow::Result;
use ark_starknet::{client2::StarknetClient, collection_manager::CollectionManager};
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::{types::AttributeValue, Client as DynamoClient};
use aws_sdk_kinesis::Client as KinesisClient;
use chrono::Utc;
use dotenv::dotenv;
use reqwest::{Client as ReqwestClient, Url};
use simple_logger::SimpleLogger;
use starknet::providers::{jsonrpc::HttpTransport, JsonRpcClient};

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();
    SimpleLogger::new().env().init().unwrap();

    let rpc_provider = env::var("RPC_PROVIDER").expect("RPC_PROVIDER must be set");
    let sn_client = StarknetClient::new(&rpc_provider.clone())?;
    let collection_manager = CollectionManager::new(sn_client);

    let rpc_client = JsonRpcClient::new(HttpTransport::new(
        Url::parse(rpc_provider.as_str()).unwrap(),
    ));

    let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
    let config = aws_config::from_env().region(region_provider).load().await;
    let kinesis_client = KinesisClient::new(&config);
    let dynamo_client = DynamoClient::new(&config);
    let reqwest_client = ReqwestClient::new();

    let indexer_table_name =
        env::var("ARK_INDEXER_TABLE_NAME").expect("ARK_INDEXER_TABLE_NAME must be set");

    let indexer_version = env::var("ARK_INDEXER_VERSION").unwrap_or(String::from("undefined"));
    let now = Utc::now();
    let unix_timestamp = now.timestamp();

    dynamo_client
        .put_item()
        .table_name(indexer_table_name)
        .item("PK", AttributeValue::S(String::from("ECS_")))
        .item("SK", AttributeValue::S(unix_timestamp.to_string()))
        .item("status", AttributeValue::S(String::from("running")))
        .item("version", AttributeValue::S(String::from(indexer_version)));

    process_blocks_continuously(
        &collection_manager,
        &rpc_client,
        &reqwest_client,
        &dynamo_client,
        &kinesis_client,
    )
    .await
}
