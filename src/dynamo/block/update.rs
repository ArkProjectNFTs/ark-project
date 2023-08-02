use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use dotenv::dotenv;
use std::env;

// This function adds a block number to the list of fetched blocks.
pub async fn update_block(
  dynamo_client: &Client,
  block_number: u64,
  status: bool,
) -> Result<(), Error> {
  dotenv().ok();
  let table = env::var("ARK_BLOCKS_TABLE_NAME").expect("ARK_BLOCKS_TABLE_NAME must be set");
  let block_number_av = AttributeValue::N(block_number.to_string());
  let is_fetched_av = AttributeValue::Bool(status);
  let request = dynamo_client
      .update_item()
      .table_name(table)
      .key("block_number", block_number_av)
      .update_expression("SET is_fetched = :is_fetched")
      .expression_attribute_values(":is_fetched", is_fetched_av);

  request.send().await?;
  Ok(())
}