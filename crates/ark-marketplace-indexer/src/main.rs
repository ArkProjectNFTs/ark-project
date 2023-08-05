mod fetch_unframed_events;

use crate::fetch_unframed_events::fetch_unframed_events;
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::Client as DynamoClient;
use dotenv::dotenv;
use log::LevelFilter;
use reqwest::Client as ReqwestClient;
use simple_logger::SimpleLogger;
use starknet::{
    core::types::{BlockId, FieldElement},
    providers::{jsonrpc::HttpTransport, JsonRpcClient},
};
use std::env;
use url::Url;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let eth_token_address = env::var("ETH_TOKEN_ADDRESS").unwrap();

    SimpleLogger::new()
        .env()
        .with_level(LevelFilter::Warn)
        .with_module_level("ark_marketplace_indexer", LevelFilter::Info)
        .init()
        .unwrap();

    let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
    let config = aws_config::from_env().region(region_provider).load().await;
    let dynamo_client = DynamoClient::new(&config);
    let reqwest_client = ReqwestClient::new();

    let rpc_client = JsonRpcClient::new(HttpTransport::new(
        Url::parse("https://starknode.thearkproject.dev/mainnet").unwrap(),
    ));

    // // Unframed contract

    let unframed_start_block = BlockId::Number(105658);
    let unframed_contract_address = FieldElement::from_hex_be(
        "0x051734077ba7baf5765896c56ce10b389d80cdcee8622e23c0556fb49e82df1b",
    )
    .unwrap();
    let events = fetch_unframed_events(
        rpc_client,
        dynamo_client,
        reqwest_client,
        unframed_start_block,
        None,
        unframed_contract_address,
        &eth_token_address,
    )
    .await;

    println!("events: {:?}", events);
}
