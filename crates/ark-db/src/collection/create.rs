use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use log::info;

pub async fn create_collection(
    client: &Client,
    table_name: &str,
    token_address: &str,
    contract_type: &str,
) -> Result<(), Error> {
    info!("create_collection {:?}", token_address);

    let _ = client
        .put_item()
        .table_name(table_name)
        .item("address", AttributeValue::S(token_address.to_string()))
        .item(
            "collection_type",
            AttributeValue::S(contract_type.to_string()),
        )
        .send()
        .await?;

    Ok(())
}
