use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use std::collections::HashMap;

pub async fn get_collection(
    client: &Client,
    address: String,
) -> Result<Option<HashMap<String, AttributeValue>>, Error> {
    println!("get_collection: {:?}", address);

    let request = client
        .get_item()
        .table_name("ark_mainnet_collections") // make sure to provide table name
        .key("address", AttributeValue::S(address))
        .send()
        .await?;

    println!("dynamodb result: {:?}", request.item);

    Ok(request.item)
}
