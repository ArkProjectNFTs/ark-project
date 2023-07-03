use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use dotenv::dotenv;
use std::env;

pub async fn is_contract_address_fetched_and_type_unknown(
  dynamo_client: &Client,
  contract_address: &str,
) -> Result<bool, Error> {
  dotenv().ok();
  let table = env::var("ARK_COLLECTIONS_TABLE_NAME").expect("ARK_COLLECTIONS_TABLE_NAME must be set");
  let contract_address_av = AttributeValue::S(contract_address.to_string());
  let request = dynamo_client
      .get_item()
      .table_name(table)
      .key("address", contract_address_av);

  let result = request.send().await?;
  if let Some(item) = result.item {
      if let Some(contract_type) = item.get("contract_type") {
          match contract_type.as_s() {
              Ok(contract_type_string) => {
                  return Ok(contract_type_string == "unknown")
              }
              Err(_) => return Ok(false),
          }
      }
  }

  Ok(false)
}
