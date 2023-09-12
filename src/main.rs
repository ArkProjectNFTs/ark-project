mod constants;
mod core;
mod utils;
use crate::core::block::process_blocks_continuously;
use anyhow::Result;
use ark_starknet::{client2::StarknetClient, collection_manager::CollectionManager};
use ark_transfers_v2::{
    event_manager::EventManager, storage_manager::DefaultStorage, token_manager::TokenManager,
};
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::Client as DynamoClient;
use dotenv::dotenv;
use log::info;
use reqwest::Client as ReqwestClient;
use std::env;
use tracing::{span, Level};
use tracing_subscriber::{fmt, layer::SubscriberExt, EnvFilter, Registry};

use utils::get_ecs_task_id;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();

    // Initialize the LogTracer to convert `log` records to `tracing` events
    tracing_log::LogTracer::init().expect("Setting log tracer failed.");

    // Create the layers
    let env_filter = EnvFilter::from_default_env();
    let fmt_layer = fmt::layer();

    // Combine layers and set as global default
    let subscriber = Registry::default().with(env_filter).with(fmt_layer);

    tracing::subscriber::set_global_default(subscriber)
        .expect("Setting default subscriber failed.");

    let main_span = span!(Level::TRACE, "main");
    let _main_guard = main_span.enter();

    let rpc_provider = env::var("RPC_PROVIDER").expect("RPC_PROVIDER must be set");
    let sn_client = StarknetClient::new(&rpc_provider.clone())?;
    let collection_manager = CollectionManager::new(sn_client);

    // let rpc_client = JsonRpcClient::new(HttpTransport::new(
    //     Url::parse(rpc_provider.as_str()).unwrap(),
    // ));

    let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
    let config = aws_config::from_env().region(region_provider).load().await;
    let dynamo_client = DynamoClient::new(&config);
    let reqwest_client = ReqwestClient::new();
    let ecs_task_id = get_ecs_task_id();
    let is_continous = env::var("END_BLOCK").is_err();

    let storage_manager = DefaultStorage::new();

    let mut token_manager = TokenManager::new(&storage_manager);
    let mut event_manager = EventManager::new(&storage_manager);

    info!(
        "\n=== Indexing started ===\n\necs_task_id: {}\nis_continous: {}",
        ecs_task_id, is_continous
    );

    process_blocks_continuously(
        &collection_manager,
        &reqwest_client,
        &dynamo_client,
        &ecs_task_id,
        is_continous,
        &mut token_manager,
        &mut event_manager,
    )
    .await?;

    Ok(())
}
