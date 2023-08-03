use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use log::info;

pub async fn update_collection(
    dynamo_client: &Client,
    collection_address: String,
    name: String,
    symbol: String,
) -> Result<(), Error> {
    info!(
        "update_collection: {} {} {}",
        collection_address, name, symbol
    );

    let _ = dynamo_client
        .update_item()
        .key("address", AttributeValue::S(collection_address))
        .table_name("ark_mainnet_collections")
        .update_expression("SET collection_name = :n, symbol = :s")
        .expression_attribute_values(":n", AttributeValue::S(name.to_string()))
        .expression_attribute_values(":s", AttributeValue::S(symbol.to_string()))
        .send()
        .await?;

    Ok(())
}

pub async fn update_collection_latest_mint(
    dynamo_client: &Client,
    latest_mint: u64,
    collection_address: String,
) -> Result<(), Box<dyn std::error::Error>> {
    info!("Update latest_mint: {:?}", latest_mint);

    dynamo_client
        .update_item()
        .table_name("ark_mainnet_collections")
        .key("address", AttributeValue::S(collection_address))
        .update_expression("SET latest_mint = :latest_mint")
        .expression_attribute_values(":latest_mint", AttributeValue::S(latest_mint.to_string()))
        .send()
        .await?;

    Ok(())
}

pub async fn increment_collection_token_count(
    dynamo_client: &Client,
    collection_address: String,
    collection_type: String,
) -> Result<(), Box<dyn std::error::Error>> {
    info!(
        "Incrementing token count for collection: {:?}",
        collection_address
    );

    let _result = dynamo_client
        .update_item()
        .table_name("ark_mainnet_collections")
        .key("address", AttributeValue::S(collection_address))
        .key("collection_type", AttributeValue::S(collection_type))
        .update_expression("ADD token_count :token_count")
        .expression_attribute_values(":token_count", AttributeValue::N("1".to_string()))
        .send()
        .await?;

    Ok(())
}
