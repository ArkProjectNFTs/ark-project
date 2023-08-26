use crate::constants::BLACKLIST;
use ark_collection_update_lambda::update_additional_collection_data;
use ark_db::collection::create::create_collection;
use ark_db::contract::get::get_contract;
use ark_starknet::client::get_contract_type;
use ark_starknet::collection_manager::CollectionManager;
use ark_stream::send::send_to_kinesis;
use ark_transfers::transfer::process_transfers;
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_kinesis::Client as KinesisClient;
use log::{debug, error, info};
use reqwest::Client as ReqwestClient;
use serde_json::Value;
use starknet::core::types::EmittedEvent;
use starknet::providers::jsonrpc::HttpTransport;
use starknet::providers::JsonRpcClient;
use std::env;
use std::error::Error;
use std::time::Instant;

fn is_dev_mode() -> bool {
    match env::var("IS_DEV") {
        Ok(val) => matches!(val.to_lowercase().as_str(), "true" | "1"),
        Err(_) => panic!("IS_DEV must be set"),
    }
}

async fn handle_existing_contract_type(
    contract_type: &str,
    collection_manager: &CollectionManager,
    client: &ReqwestClient,
    dynamo_client: &DynamoClient,
    event_json: &str,
    is_dev: bool,
    kinesis_client: &KinesisClient,
    kinesis_transfer_stream: &str,
) {
    if contract_type == "unknown" {
        return;
    }

    if is_dev {
        let _ = process_transfers(
            collection_manager,
            client,
            dynamo_client,
            event_json,
            contract_type,
        )
        .await;
    } else {
        let _ = send_to_kinesis(
            kinesis_client,
            kinesis_transfer_stream,
            "transfer",
            event_json,
            contract_type,
        )
        .await;
    }
}

// Identifies contract types based on events from ABIs, checks for their presence in a Redis server, and if not found, calls contract methods to determine the type, stores this information back in Redis, and finally prints the contract type.
pub async fn process_and_categorize_contract_events(
    collection_manager: &CollectionManager,
    rpc_client: &JsonRpcClient<HttpTransport>,
    client: &ReqwestClient,
    events: &[EmittedEvent],
    dynamo_client: &DynamoClient,
    kinesis_client: &KinesisClient,
) -> Result<(), Box<dyn Error>> {
    let is_dev = is_dev_mode();

    // Get dynamo table to work with
    let collections_table =
        env::var("ARK_COLLECTIONS_TABLE_NAME").expect("ARK_COLLECTIONS_TABLE_NAME must be set");
    let kinesis_transfer_stream =
        env::var("KINESIS_TRANSFER_STREAM_NAME").expect("KINESIS_TRANSFER_STREAM_NAME must be set");

    let kinesis_collection_stream = env::var("KINESIS_COLLECTION_STREAM_NAME")
        .expect("KINESIS_COLLECTION_STREAM_NAME must be set");

    // Init start time
    let start_time = Instant::now();

    for event in events {
        let contract_address = format!("{:#064x}", &event.from_address);

        // Filter contract with most transactions from identification
        if BLACKLIST.contains(&contract_address.as_str()) {
            continue;
        }

        let block_number: u64 = event.block_number;

        // Check if contract present and type
        let contract_status = get_contract(dynamo_client, &contract_address)
            .await
            .unwrap_or(None);

        let event_json = serde_json::to_string(&event).expect("Event not convertible to JSON");

        if let Some(existing_contract_type) = contract_status {
            handle_existing_contract_type(
                &existing_contract_type,
                collection_manager,
                client,
                dynamo_client,
                &event_json,
                is_dev,
                kinesis_client,
                &kinesis_transfer_stream,
            )
            .await;
            continue;
        }

        let contract_type = get_contract_type(client, &contract_address, block_number).await;

        debug!("contract_type: {:?}", contract_type);

        match create_collection(
            dynamo_client,
            &collections_table,
            &contract_address,
            &contract_type,
        )
        .await
        {
            Ok(success) => {
                info!(
                    "[Success] New collection item added successfully.\n\
                    - Item Details: {:?}\n\
                    - Table: {}",
                    success, &collections_table
                );

                if contract_type != "unknown" {
                    // TODO: use a common function
                    if is_dev {
                        match process_transfers(
                            collection_manager,
                            client,
                            dynamo_client,
                            &event_json,
                            contract_type.as_str(),
                        )
                        .await
                        {
                            Ok(_) => {}
                            Err(e) => {
                                error!("Failed to process transfer: {:?}", e);
                                continue;
                            }
                        }

                        match update_additional_collection_data(
                            rpc_client,
                            client,
                            dynamo_client,
                            &contract_address,
                            block_number,
                        )
                        .await
                        {
                            Ok(_) => {}
                            Err(e) => {
                                error!("Failed to update additional collection data: {:?}", e);
                                continue;
                            }
                        }
                    } else {
                        let mut map = std::collections::HashMap::new();
                        map.insert("contract_address", Value::String(contract_address));
                        map.insert("block_number", Value::Number(block_number.into()));
                        let serialized_map = serde_json::to_string(&map).unwrap();
                        send_to_kinesis(
                            kinesis_client,
                            kinesis_collection_stream.as_str(),
                            "collection",
                            &serialized_map,
                            contract_type.as_str(),
                        )
                        .await
                        .unwrap();
                        send_to_kinesis(
                            kinesis_client,
                            kinesis_transfer_stream.as_str(),
                            "transfer",
                            &event_json,
                            contract_type.as_str(),
                        )
                        .await
                        .unwrap();
                    }
                }
            }
            Err(e) => {
                error!(
                    "[Error] Failed to add a new item to the collection.\n\
                    - Error Details: {:?}\n\
                    - Target Table: {}",
                    e, &collections_table
                );
            }
        }
    }
    let duration = start_time.elapsed();
    debug!("Time elapsed in contracts block is: {:?}", duration);

    Ok(())
}
