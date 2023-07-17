use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};

#[allow(dead_code)]
pub async fn check_address_exists(
    client: &Client,
    table_name: &str,
    address: &str,
) -> Result<bool, Error> {
    // get the item
    let response = client.get_item().table_name(table_name).key(
        "Address".to_string(),
        AttributeValue::S(address.to_string()),
    );
    let resp = response.send().await?;
    let item = resp.item.unwrap();
    println!("{:?}", item);
    let is_not_empty = !item.is_empty();
    // return true if item exists, false otherwise
    Ok(is_not_empty)
}
