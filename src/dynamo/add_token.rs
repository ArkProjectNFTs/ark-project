use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use std::collections::HashMap;

pub async fn add_token(
    client: &aws_sdk_dynamodb::Client,
    collection_address: String,
    token_id: String,
    initial_metadata_uri: String,
) -> Result<(), Error> {
    let mut item: HashMap<String, AttributeValue> = HashMap::new();

    item.insert("address".into(), AttributeValue::S(collection_address));
    item.insert("token_id".into(), AttributeValue::S(token_id));
    item.insert("token_uri".into(), AttributeValue::S(initial_metadata_uri));
    // ... you will need to add all other properties like this ...

    // item.insert(
    //     "last_metadata_refresh".into(),
    //     AttributeValue::S(Utc::now().to_rfc3339()),
    // );

    // let result = client
    //     .put_item()
    //     .table_name("ark_mainnet_tokens")
    //     .item(item)
    //     .send()
    //     .await;

    // match result {
    //     Ok(_) => println!("Inserted into ark_mainnet_tokens"),
    //     Err(e) => println!("Error inserting into ark_mainnet_tokens: {:?}", e),
    // }

    Ok(())
}
