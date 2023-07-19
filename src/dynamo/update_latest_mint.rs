use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};

pub async fn update_latest_mint(
    dynamo_client: &Client,
    latest_mint: u64,
    collection_address: String,
) -> Result<(), Error> {
    let _ = dynamo_client
        .update_item()
        .table_name("ark_mainnet_collections")
        .key("address", AttributeValue::S(collection_address))
        .key("latest_mint", AttributeValue::S(latest_mint.to_string()))
        .send()
        .await;

    Ok(())
}
