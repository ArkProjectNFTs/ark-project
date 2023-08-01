use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Client;

#[allow(dead_code)]
pub async fn check_address_exists(
    client: &Client,
    table_name: &str,
    address: &str,
) -> Result<bool, Box<dyn std::error::Error>> {
    let resp = client
        .get_item()
        .table_name(table_name)
        .key(
            "address".to_string(),
            AttributeValue::S(address.to_string()),
        )
        .send()
        .await?;

    match resp.item {
        Some(item) => {
            println!("{:?}", item);
            Ok(!item.is_empty())
        }
        None => Err("No item returned from database.".into()),
    }
}
