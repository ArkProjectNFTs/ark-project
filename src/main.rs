mod constants;
mod core;
mod utils;
use crate::core::block::process_blocks_continuously;
use anyhow::Result;
use ark_db::indexer::create::create_indexer;
use ark_starknet::{client2::StarknetClient, collection_manager::CollectionManager};
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_kinesis::Client as KinesisClient;
use dotenv::dotenv;
use reqwest::{Client as ReqwestClient, Url};
use simple_logger::SimpleLogger;
use starknet::providers::{jsonrpc::HttpTransport, JsonRpcClient};
use std::env;

fn extract_ecs_task_id(text: &str) -> Option<&str> {
    let pattern = regex::Regex::new(r"/v3/([a-f0-9]{32})-").unwrap();
    pattern
        .captures(text)
        .and_then(|cap| cap.get(1).map(|m| m.as_str()))
}

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

    let container_metadata_uri = env::var("ECS_CONTAINER_METADATA_URI").unwrap_or("".to_string());
    let task_id = extract_ecs_task_id(container_metadata_uri.as_str());

    if task_id.is_some() {
        create_indexer(&dynamo_client, task_id.unwrap()).await?;
    }

    process_blocks_continuously(
        &collection_manager,
        &rpc_client,
        &reqwest_client,
        &dynamo_client,
        &kinesis_client,
    )
    .await
}
