use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};

pub async fn update_collection(
    dynamo_client: &Client,
    collection_address: String,
    name: String,
    symbol: String,
) -> Result<(), Error> {
    println!(
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
