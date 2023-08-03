use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use std::env;

pub async fn get_contract(
    dynamo_client: &Client,
    contract_address: &str,
) -> Result<Option<String>, Error> {
    let table =
        env::var("ARK_COLLECTIONS_TABLE_NAME").expect("ARK_COLLECTIONS_TABLE_NAME must be set");
    let contract_address_av = AttributeValue::S(contract_address.to_string());
    let request = dynamo_client
        .get_item()
        .table_name(table)
        .key("address", contract_address_av);

    let result = request.send().await?;
    if let Some(item) = result.item {
        if let Some(contract_type) = item.get("collection_type") {
            match contract_type.as_s() {
                Ok(contract_type_string) => return Ok(Some(contract_type_string.to_string())),
                Err(_) => return Ok(None),
            }
        }
    }

    Ok(None)
}
