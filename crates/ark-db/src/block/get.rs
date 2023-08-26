use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use log::info;
use std::env;

pub async fn is_fetched_block(dynamo_client: &Client, block_number: u64) -> Result<bool, Error> {
    let table = env::var("ARK_BLOCKS_TABLE_NAME").expect("ARK_BLOCKS_TABLE_NAME must be set");
    let block_number_av = AttributeValue::N(block_number.to_string());
    let request = dynamo_client
        .get_item()
        .table_name(table)
        .key("block_number", block_number_av);

    let result = request.send().await;

    match result {
        Ok(value) => {
            info!("get_block: {:?}", value.item);

            if let Some(item) = value.item {
                if let Some(is_fetched) = item.get("is_fetched") {
                    match is_fetched.as_bool() {
                        Ok(is_fetched_bool) => return Ok(*is_fetched_bool),
                        Err(_) => return Ok(false),
                    }
                }
            }
        }
        Err(e) => {
            println!(
                "Error requesting block number {} to the list of fetched blocks: {:?}",
                block_number, e
            );
        }
    }

    Ok(false)
}

pub async fn get_block_info(dynamo_client: &Client, block_number: u64) -> Result<u64, ()> {
    let table =
        env::var("ARK_BLOCKS_INFO_TABLE_NAME").expect("ARK_BLOCKS_INFO_TABLE_NAME must be set");

    let request = dynamo_client
        .get_item()
        .table_name(table)
        .key("block_number", AttributeValue::N(block_number.to_string()));

    match request.send().await {
        Ok(block) => {
            if let Some(item) = block.item {
                if let Some(raw_timestamp) = item.get("timestamp") {
                    if raw_timestamp.is_n() {
                        let str_timestamp = raw_timestamp.as_n().unwrap();
                        let timestamp: u64 = u64::from_str_radix(str_timestamp, 10).unwrap();
                        return Ok(timestamp);
                    }
                }
            }
        }
        Err(_err) => {}
    }

    return Err(());
}
