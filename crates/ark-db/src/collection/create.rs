use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use log::info;

pub async fn create_collection(
    client: &Client,
    table_name: &str,
    token_address: &str,
) -> Result<(), Error> {
    info!("create_collection {:?}", token_address);

    let result = client
        .get_item()
        .key("address", AttributeValue::S(token_address.to_string()))
        .table_name(table_name)
        .send()
        .await?;

    // If results returns 0 results
    if result.item.is_none() {
        let _ = client
            .put_item()
            .table_name(table_name)
            .item("address", AttributeValue::S(token_address.to_string()))
            .send()
            .await?;
    }

    Ok(())
}
