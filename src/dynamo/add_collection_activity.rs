use aws_sdk_dynamodb::types::{AttributeValue, Select};
use aws_sdk_dynamodb::{Client, Error};
use std::collections::HashMap;

pub async fn add_collection_activity(
    client: &Client,
    address: &str,
    username: &str,
) -> Result<(), Error> {
    let mut item: HashMap<String, AttributeValue> = HashMap::new();

    item.insert("address".into(), AttributeValue::S(address.into()));
    item.insert("username".into(), AttributeValue::S(username.into()));

    // let request = client
    //     .put_item()
    //     .table_name("ark_mainnet_collection_activities")
    //     .item(item);

    // let _ = request.send().await?;

    Ok(())
}
