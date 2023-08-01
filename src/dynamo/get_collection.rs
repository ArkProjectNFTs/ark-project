use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use std::collections::HashMap;

pub async fn get_collection(
    client: &Client,
    address: String,
) -> Result<Option<HashMap<String, AttributeValue>>, Error> {
    println!("get_collection: {:?}", address);

    let request = client
        .query()
        .table_name("ark_mainnet_collections")
        .key_condition_expression("#address = :address")
        .expression_attribute_names("#address", "address")
        .expression_attribute_values(":address", AttributeValue::S(address))
        .send()
        .await?;

    Ok(request.items.unwrap().pop())
}
