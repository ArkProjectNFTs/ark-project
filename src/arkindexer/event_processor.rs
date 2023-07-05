use crate::utils::{extract_events, filter_transfer_events, get_selector_from_name};
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_kinesis::Client as KinesisClient;

use crate::arkindexer::contract_processor::identify_contract_types_from_transfers;
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;

// This function extracts and filters transfer events from a blockchain block.
// TODO: send events to a kinesis queue for further processing
pub async fn get_transfer_events(
    client: &Client,
    block: HashMap<String, Value>,
    dynamo_client: &DynamoClient,
    kinesis_client: &KinesisClient,
) -> () {
    let event_hash = get_selector_from_name("Transfer");

    let events = extract_events(&block);
    let transfer_events = filter_transfer_events(events, &event_hash);

    identify_contract_types_from_transfers(client, transfer_events, dynamo_client, kinesis_client).await;
}
