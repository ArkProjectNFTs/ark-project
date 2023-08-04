use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_dynamodb::Error;
use log::info;
use std::collections::HashMap;

pub async fn get_collection(
    client: &DynamoClient,
    address: String,
) -> Result<Option<HashMap<String, AttributeValue>>, Error> {
    info!("get_collection: {:?}", address);

    let request = client
        .get_item()
        .table_name("ark_mainnet_collections")
        .key("address", AttributeValue::S(address))
        .send()
        .await?;

    Ok(request.item)
}
