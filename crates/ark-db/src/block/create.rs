use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
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

  request.send().await?;
  Ok(())
}