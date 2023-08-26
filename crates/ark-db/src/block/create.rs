use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use log::{error, info};
use std::env;

// This function adds a block number to the list of fetched blocks.
pub async fn create_block(
    dynamo_client: &Client,
    block_number: u64,
    status: bool,
) -> Result<(), Error> {
    let table = env::var("ARK_BLOCKS_TABLE_NAME").expect("ARK_BLOCKS_TABLE_NAME must be set");
    let block_number_av = AttributeValue::N(block_number.to_string());
    let is_fetched_av = AttributeValue::Bool(status);
    let request = dynamo_client
        .put_item()
        .table_name(table)
        .item("block_number", block_number_av)
        .item("is_fetched", is_fetched_av);

    let result = request.send().await;

    match result {
        Ok(_) => {
            info!(
                "Successfully added block number {} to the list of fetched blocks",
                block_number
            );
        }
        Err(e) => {
            error!(
                "Error adding block number {} to the list of fetched blocks: {:?}",
                block_number, e
            );
        }
    }

    Ok(())
}

pub async fn create_block_info(
    dynamo_client: &Client,
    block_number: u64,
    timestamp: u64,
) -> Result<(), Error> {
    let table =
        env::var("ARK_BLOCKS_INFO_TABLE_NAME").expect("ARK_BLOCKS_INFO_TABLE_NAME must be set");

    let request = dynamo_client
        .put_item()
        .table_name(table)
        .item("block_number", AttributeValue::N(block_number.to_string()))
        .item("timestamp", AttributeValue::S(timestamp.to_string()));

    let result = request.send().await;

    match result {
        Ok(_) => {
            info!(
                "Successfully added block number {} to the list of blocks info",
                block_number
            );
        }
        Err(e) => {
            error!(
                "Error adding block number {} to the list of blocks info: {:?}",
                block_number, e
            );
        }
    }

    Ok(())
}
