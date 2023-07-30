use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};

pub async fn add_collection_activity(
    dynamo_client: &Client,
    address: String,
    timestamp: u64,
    block_number: u64,
    event_type: String,
    from_address: String,
    token_id: String,
    token_uri: String,
    to_address: String,
    transaction_hash: String,
    token_type: String,
) -> Result<(), Error> {
    println!("add_collection_activity: {:?}", address);

    let result = dynamo_client
        .put_item()
        .table_name("ark_mainnet_collection_activities")
        .item("address", AttributeValue::S(address))
        .item("timestamp", AttributeValue::N(timestamp.to_string()))
        .item("block_number", AttributeValue::N(block_number.to_string()))
        .item("event_type", AttributeValue::S(event_type))
        .item("from_address", AttributeValue::S(from_address))
        .item("to_address", AttributeValue::S(to_address))
        .item("token_id", AttributeValue::S(token_id))
        .item("token_uri", AttributeValue::S(token_uri))
        .item("transaction_hash", AttributeValue::S(transaction_hash))
        .item("type", AttributeValue::S(token_type))
        .send()
        .await;

    println!("dynamodb result: {:?}", result);

    Ok(())
}
