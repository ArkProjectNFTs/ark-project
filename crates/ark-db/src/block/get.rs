use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use log::info;
use std::env;

pub async fn get_block(dynamo_client: &Client, block_number: u64) -> Result<bool, Error> {
    let table = env::var("ARK_BLOCKS_TABLE_NAME").expect("ARK_BLOCKS_TABLE_NAME must be set");

    info!("var ARK_BLOCKS_TABLE_NAME: {:?}", table);

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
