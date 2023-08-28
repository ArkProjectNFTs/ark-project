use super::contract::identify_contract_types_from_transfers;
use anyhow::Result;
use ark_db::block::create::create_block;
use ark_db::block::get::get_block;
use ark_db::block::update::update_block;
use ark_starknet::client2::StarknetClient;
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_kinesis::Client as KinesisClient;
use log::info;
use reqwest::Client as ReqwestClient;
use starknet::core::types::{BlockId, EmittedEvent};
use starknet::core::utils::get_selector_from_name;
use starknet::providers::jsonrpc::HttpTransport;
use starknet::providers::JsonRpcClient;
use std::env;
use std::time::{Duration, Instant};
use tokio::time::sleep;

// This function continually fetches and processes blockchain blocks as they are mined, maintaining pace with the most recent block, extracting transfer events from each, and then pausing if it catches up, ensuring a continuous and up-to-date data stream.
pub async fn process_blocks_continuously(
    sn_client: &StarknetClient,
    rpc_client: &JsonRpcClient<HttpTransport>,
    reqwest_client: &ReqwestClient,
    dynamo_client: &DynamoClient,
    kinesis_client: &KinesisClient,
) -> Result<()> {
    let starting_block = env::var("START_BLOCK")
        .expect("START_BLOCK must be set")
        .parse::<u64>()
        .unwrap();

    info!("Starting block: {}", starting_block);

    // Set starting block
    let mut current_block_number: u64 = starting_block;
    // Loop Through Blocks and wait for new blocks
    loop {
        let execution_time = Instant::now();
        let latest_block_number = sn_client.block_number().await?;

        info!(
            "Latest block: {}, Current block: {}, Indexing progress: {:.2}%",
            latest_block_number,
            current_block_number,
            (current_block_number as f64 / latest_block_number as f64) * 100.0
        );

        if current_block_number <= latest_block_number {
            let is_block_fetched = get_block(dynamo_client, current_block_number).await?;

            if is_block_fetched {
                info!("Current block {} is already fetched", current_block_number);
                current_block_number += 1;
                continue;
            }

            create_block(dynamo_client, current_block_number, false).await?;

            // We only want Transfer events.
            // The selector is always the first key, but the fetch blocks can
            // already filter for us.
            let block_transfer_events = &sn_client
                .fetch_events(
                    BlockId::Number(current_block_number),
                    BlockId::Number(current_block_number),
                    None,
                )
                .await?;

            let events_only: Vec<EmittedEvent> =
                if block_transfer_events.contains_key(&current_block_number) {
                    block_transfer_events[&current_block_number]
                        .clone()
                        .into_iter()
                        // Unwrap is safe as Transfer is a valid selector.
                        .filter(|e| e.keys[0] == get_selector_from_name("Transfer").unwrap())
                        .collect()
                } else {
                    // No event to process.
                    info!("No event to process for block {:?}", current_block_number);
                    update_block(dynamo_client, current_block_number, true).await?;
                    current_block_number += 1;
                    continue;
                };

            info!(
                "{:?} events to process for block {:?}",
                events_only.len(),
                current_block_number
            );

            identify_contract_types_from_transfers(
                sn_client,
                rpc_client,
                reqwest_client,
                &events_only,
                dynamo_client,
                kinesis_client,
            )
            .await;

            update_block(dynamo_client, current_block_number, true).await?;

            let execution_time_elapsed_time = execution_time.elapsed();
            let execution_time_elapsed_time_ms = execution_time_elapsed_time.as_millis();
            info!(
                "Indexing time: {}ms (block {})",
                execution_time_elapsed_time_ms, current_block_number
            );
            current_block_number += 1;
        } else {
            sleep(Duration::from_secs(10)).await;
        }
    }
}
