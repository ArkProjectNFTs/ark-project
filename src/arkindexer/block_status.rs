use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use dotenv::dotenv;
use std::env;

pub async fn get_block_status(dynamo_client: &Client, block_number: u64) -> Result<bool, Error> {
    dotenv().ok();
    let table = env::var("ARK_BLOCKS_TABLE_NAME").expect("ARK_BLOCKS_TABLE_NAME must be set");
    let block_number_av = AttributeValue::S(block_number.to_string());
    let request = dynamo_client
        .get_item()
        .table_name(table)
        .key("block_number", block_number_av);

    let result = request.send().await?;
    if let Some(item) = result.item {
        if let Some(is_fetched) = item.get("is_fetched") {
            match is_fetched.as_bool() {
                Ok(is_fetched_bool) => return Ok(*is_fetched_bool),
                Err(_) => return Ok(false),
            }
        }
    }

    Ok(false)
}

// This function adds a block number to the list of fetched blocks.
pub async fn mark_block_status(
    dynamo_client: &Client,
    block_number: u64,
    status: bool,
) -> Result<(), Error> {
    dotenv().ok();
    let table = env::var("ARK_BLOCKS_TABLE_NAME").expect("ARK_BLOCKS_TABLE_NAME must be set");
    let block_number_av = AttributeValue::S(block_number.to_string());
    let is_fetched_av = AttributeValue::Bool(status);
    let request = dynamo_client
        .put_item()
        .table_name(table)
        .item("block_number", block_number_av)
        .item("is_fetched", is_fetched_av);

    request.send().await?;
    Ok(())
}
