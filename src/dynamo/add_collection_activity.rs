use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use std::collections::HashMap;

pub async fn add_collection_activity(dynamo_client: &Client) -> Result<(), Error> {
    let mut item: HashMap<String, AttributeValue> = HashMap::new();

    // item.insert("address".into(), AttributeValue::S(address.into()));
    // item.insert("username".into(), AttributeValue::S(username.into()));

    // let result = client
    //     .put_item()
    //     .table_name("ark_mainnet_collection_activities")
    //     .item(item)
    //     .send()
    //     .await;

    // match result {
    //     Ok(_) => Ok(()),  // operation successful
    //     Err(e) => Err(e), // pass the error further
    // }

    Ok(())
}
