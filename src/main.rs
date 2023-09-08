mod constants;
mod core;
mod utils;
use crate::core::block::process_blocks_continuously;
use anyhow::Result;
use ark_starknet::{client2::StarknetClient, collection_manager::CollectionManager};
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_kinesis::Client as KinesisClient;
use dotenv::dotenv;
use log::info;
use reqwest::{Client as ReqwestClient, Url};
use simple_logger::SimpleLogger;
use starknet::providers::{jsonrpc::HttpTransport, JsonRpcClient};
use std::env;
use utils::get_ecs_task_id;

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
    let ecs_task_id = get_ecs_task_id();
    let is_continous = env::var("END_BLOCK").is_ok();

    info!(
        "\n=== Indexing started ===\n\necs_task_id: {}\nis_continous: {}",
        ecs_task_id, is_continous
    );

    process_blocks_continuously(
        &collection_manager,
        &rpc_client,
        &reqwest_client,
        &dynamo_client,
        &kinesis_client,
        &ecs_task_id,
        is_continous,
    )
    .await?;

    Ok(())
}
