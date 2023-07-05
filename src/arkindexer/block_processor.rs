use crate::arkindexer::block_status::{get_block_status, mark_block_status};
use crate::arkindexer::event_processor::get_transfer_events;
use crate::starknet::client::{fetch_block, get_latest_block};
use aws_sdk_kinesis::Client as KinesisClient;
use aws_sdk_dynamodb::Client as DynamoClient;
use dotenv::dotenv;
use reqwest::Client;
use std::env;
use std::time::Duration;
use tokio::time::sleep;

// This function continually fetches and processes blockchain blocks as they are mined, maintaining pace with the most recent block, extracting transfer events from each, and then pausing if it catches up, ensuring a continuous and up-to-date data stream.
pub async fn get_blocks(
    reqwest_client: &Client,
    dynamo_client: &DynamoClient,
    kinesis_client: &KinesisClient,
) -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    let starting_block = env::var("START_BLOCK").expect("ARK_COLLECTIONS_TABLE_NAME must be set").parse::<u64>().unwrap();
    // Set starting block
    let mut current_block_number: u64 = starting_block;
    // Loop Through Blocks and wait for new blocks
    loop {
        let latest_block_number = get_latest_block(&reqwest_client).await?;
        let is_block_fetched = get_block_status(&dynamo_client, current_block_number).await?;
        println!("Latest block: {}", latest_block_number);
        println!("Current block: {}", current_block_number);
        if current_block_number <= latest_block_number && is_block_fetched {
            println!("Current block {} is fetched:", current_block_number);
            current_block_number += 1;
        } else if current_block_number <= latest_block_number && !is_block_fetched {
            mark_block_status(&dynamo_client, current_block_number, false).await?;
            let block = fetch_block(&reqwest_client, current_block_number).await;
            get_transfer_events(&reqwest_client, block.unwrap(), &dynamo_client, &kinesis_client).await;
            mark_block_status(&dynamo_client, current_block_number, true).await?;
            current_block_number += 1;
        } else {
            sleep(Duration::from_secs(10)).await;
        }
    }
}
