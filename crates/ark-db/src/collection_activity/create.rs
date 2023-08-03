use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use log::info;

pub struct CollectionActivity {
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

pub async fn create_collection_activity(
    dynamo_client: &Client,
    collection_activity: CollectionActivity,
) -> Result<(), Error> {
    info!("add_collection_activity: {:?}", collection_activity.address);

    let _result = dynamo_client
        .put_item()
        .table_name("ark_mainnet_collection_activities")
        .item("address", AttributeValue::S(collection_activity.address))
        .item(
            "timestamp",
            AttributeValue::N(collection_activity.timestamp.to_string()),
        )
        .item(
            "block_number",
            AttributeValue::N(collection_activity.block_number.to_string()),
        )
        .item(
            "event_type",
            AttributeValue::S(collection_activity.event_type),
        )
        .item(
            "from_address",
            AttributeValue::S(collection_activity.from_address),
        )
        .item(
            "to_address",
            AttributeValue::S(collection_activity.to_address),
        )
        .item(
            "token_id",
            AttributeValue::S(collection_activity.padded_token_id),
        )
        .item(
            "token_uri",
            AttributeValue::S(collection_activity.token_uri),
        )
        .item(
            "transaction_hash",
            AttributeValue::S(collection_activity.transaction_hash),
        )
        .item(
            "collection_type",
            AttributeValue::S(collection_activity.token_type),
        )
        .send()
        .await;

    Ok(())
}
