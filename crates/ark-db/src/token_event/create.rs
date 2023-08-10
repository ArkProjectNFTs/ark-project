use std::env;

use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use log::info;

pub struct TokenEvent {
    pub address: String,
    pub timestamp: u64,
    pub block_number: u64,
    pub event_type: String,
    pub from_address: String,
    pub padded_token_id: String,
    pub token_uri: String,
    pub to_address: String,
    pub transaction_hash: String,
    pub token_type: String,
}

pub async fn create_token_event(
    dynamo_client: &Client,
    token_event: TokenEvent,
) -> Result<(), Error> {
    info!("create_token_event: {:?}", token_event.address);

    let token_events_table_name =
        env::var("ARK_TOKENS_EVENTS_TABLE_NAME").expect("ARK_TOKENS_EVENTS_TABLE_NAME must be set");

    let result = dynamo_client
        .put_item()
        .table_name(token_events_table_name)
        .item("address", AttributeValue::S(token_event.address))
        .item(
            "event_timestamp",
            AttributeValue::N(token_event.timestamp.to_string()),
        )
        .item(
            "block_number",
            AttributeValue::N(token_event.block_number.to_string()),
        )
        .item("event_type", AttributeValue::S(token_event.event_type))
        .item("from_address", AttributeValue::S(token_event.from_address))
        .item("to_address", AttributeValue::S(token_event.to_address))
        .item("token_id", AttributeValue::S(token_event.padded_token_id))
        .item(
            "transaction_hash",
            AttributeValue::S(token_event.transaction_hash),
        )
        .item("collection_type", AttributeValue::S(token_event.token_type))
        .send()
        .await;

    println!("dynamodb result: {:?}", result);

    Ok(())
}
