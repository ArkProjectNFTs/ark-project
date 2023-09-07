use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use std::env;

pub async fn get_block(dynamo_client: &Client, block_number: u64) -> Result<bool, Error> {
    let indexer_table_name =
        env::var("ARK_INDEXER_TABLE_NAME").expect("ARK_INDEXER_TABLE_NAME must be set");
    let partition_key = format!("Block_{}", block_number);

    let request = dynamo_client
        .query()
        .table_name(indexer_table_name)
        .key_condition_expression("#PK = :PK")
        .expression_attribute_names("#PK", "PK")
        .expression_attribute_values(":PK", AttributeValue::S(partition_key));

    match request.send().await {
        Ok(value) => {
            if let Some(items) = value.items() {
                if let Some(item) = items.first() {
                    if let Some(is_fetched) = item.get("is_fetched") {
                        match is_fetched.as_bool() {
                            Ok(is_fetched_bool) => return Ok(*is_fetched_bool),
                            Err(_) => return Ok(false),
                        }
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
