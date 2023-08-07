mod unframed;
mod utils;

use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::Client as DynamoClient;
use dotenv::dotenv;
use log::LevelFilter;
use reqwest::Client as ReqwestClient;
use simple_logger::SimpleLogger;
use starknet::{
    core::types::{BlockId, BlockTag, FieldElement},
    providers::{jsonrpc::HttpTransport, JsonRpcClient},
};
use std::env;
use url::Url;

use crate::unframed::events::fetch_unframed_events;

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

    let rpc_provider = env::var("RPC_PROVIDER").unwrap();
    let rpc_client = JsonRpcClient::new(HttpTransport::new(Url::parse(&rpc_provider).unwrap()));

    let starting_block = env::var("START_BLOCK")
        .expect("START_BLOCK must be set")
        .parse::<u64>()
        .unwrap();

    fetch_marketplace_events(
        rpc_client,
        dynamo_client,
        reqwest_client,
        starting_block,
        &eth_token_address,
    )
    .await;
}

async fn fetch_marketplace_events(
    rpc_client: JsonRpcClient<HttpTransport>,
    dynamo_client: DynamoClient,
    reqwest_client: ReqwestClient,
    starting_block: u64,
    eth_token_address: &str,
) {
    // Unframed contract

    let unframed_start_block = BlockId::Number(starting_block);
    let unframed_contract_address_str =
        env::var("UNFRAMED_CONTRACT_ADDRESS").expect("UNFRAMED_CONTRACT_ADDRESS must be set");
    let unframed_contract_address =
        FieldElement::from_hex_be(&unframed_contract_address_str).unwrap();

    let events = fetch_unframed_events(
        rpc_client,
        dynamo_client,
        reqwest_client,
        unframed_start_block,
        BlockId::Tag(BlockTag::Latest),
        unframed_contract_address,
        &eth_token_address,
    )
    .await;

    println!("events: {:?}", events);
}
