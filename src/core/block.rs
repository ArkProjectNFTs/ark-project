use crate::core::event::extract_transfer_events;
use ark_db::block::create::create_block;
use ark_db::block::get::get_block;
use ark_db::block::update::update_block;
use ark_starknet::client::{fetch_block, get_latest_block};
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_kinesis::Client as KinesisClient;
use dotenv::dotenv;
use log::info;
use reqwest::Client as ReqwestClient;
use std::env;
use std::time::{Duration, Instant};
use tokio::time::sleep;

// This function continually fetches and processes blockchain blocks as they are mined, maintaining pace with the most recent block, extracting transfer events from each, and then pausing if it catches up, ensuring a continuous and up-to-date data stream.
pub async fn process_blocks_continuously(
    reqwest_client: &ReqwestClient,
    dynamo_client: &DynamoClient,
    kinesis_client: &KinesisClient,
) -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    let starting_block = env::var("START_BLOCK")
        .expect("START_BLOCK must be set")
        .parse::<u64>()
        .unwrap();
    // Set starting block
    let mut current_block_number: u64 = starting_block;
    // Loop Through Blocks and wait for new blocks
    loop {
        let execution_time = Instant::now();
        let latest_block_number = get_latest_block(reqwest_client).await?;

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
            } else {
                create_block(dynamo_client, current_block_number, false).await?;
                let block = fetch_block(reqwest_client, current_block_number).await;

                extract_transfer_events(
                    reqwest_client,
                    block.unwrap(),
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
            }
        } else {
            sleep(Duration::from_secs(10)).await;
        }
    }
}
