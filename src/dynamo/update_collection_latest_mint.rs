use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Client;

pub async fn update_collection_latest_mint(
    dynamo_client: &Client,
    latest_mint: u64,
    collection_address: String,
    collection_type: String,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("Update latest_mint: {:?}", latest_mint);

    let _result = dynamo_client
        .update_item()
        .table_name("ark_mainnet_collections")
        .key("address", AttributeValue::S(collection_address))
        .key("collection_type", AttributeValue::S(collection_type))
        .update_expression("SET latest_mint = :latest_mint")
        .expression_attribute_values(":latest_mint", AttributeValue::S(latest_mint.to_string()))
        .send()
        .await?;

    Ok(())
}
