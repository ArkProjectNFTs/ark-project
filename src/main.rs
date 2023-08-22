mod constants;
mod core;
mod utils;
use std::env;

use crate::core::block::process_blocks_continuously;
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_kinesis::Client as KinesisClient;
use dotenv::dotenv;
use log::LevelFilter;
use reqwest::{Client as ReqwestClient, Url};
use simple_logger::SimpleLogger;
use starknet::providers::{jsonrpc::HttpTransport, JsonRpcClient};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    SimpleLogger::new()
        .env()
        .with_level(LevelFilter::Warn)
        .with_module_level("ark_indexer", LevelFilter::Info)
        .with_module_level("ark_db", LevelFilter::Info)
        .with_module_level("ark_metadata", LevelFilter::Info)
        .with_module_level("ark_owner", LevelFilter::Info)
        .with_module_level("ark_starknet", LevelFilter::Info)
        .with_module_level("ark_stream", LevelFilter::Info)
        .with_module_level("ark_transfers", LevelFilter::Info)
        .init()
        .unwrap();

    let rpc_provider = env::var("RPC_PROVIDER").expect("RPC_PROVIDER must be set");
    let rpc_client = JsonRpcClient::new(HttpTransport::new(
        Url::parse(rpc_provider.as_str()).unwrap(),
    ));

    let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
    let config = aws_config::from_env().region(region_provider).load().await;
    let kinesis_client = KinesisClient::new(&config);
    let dynamo_client = DynamoClient::new(&config);
    let reqwest_client = ReqwestClient::new();
    process_blocks_continuously(
        &rpc_client,
        &reqwest_client,
        &dynamo_client,
        &kinesis_client,
    )
    .await
}
