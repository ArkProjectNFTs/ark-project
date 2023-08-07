use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_dynamodb::Error;
use log::info;
use std::collections::HashMap;
use std::env;

pub async fn get_collection(
    client: &DynamoClient,
    address: String,
) -> Result<Option<HashMap<String, AttributeValue>>, Error> {
    info!("get_collection: {:?}", address);

    let collections_table_name =
        env::var("ARK_COLLECTIONS_TABLE_NAME").expect("ARK_COLLECTIONS_TABLE_NAME must be set");

    let request = client
        .get_item()
        .table_name(collections_table_name)
        .key("address", AttributeValue::S(address))
        .send()
        .await?;

    Ok(request.item)
}
