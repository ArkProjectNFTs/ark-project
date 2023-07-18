use crate::arkindexer::contract_status::get_contract_status;
use crate::constants::BLACKLIST;
use crate::dynamo;
use crate::dynamo::create::{add_collection_item, CollectionItem};
use crate::events::transfer_processor::process_transfers;
use crate::kinesis::send::send_to_kinesis;
use crate::starknet::utils::get_contract_property_string;
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_kinesis::Client as KinesisClient;
use dotenv::dotenv;
use log::info;
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use std::env;
use std::time::Instant;

// Identifies contract types based on events from ABIs, checks for their presence in a Redis server, and if not found, calls contract methods to determine the type, stores this information back in Redis, and finally prints the contract type.
pub async fn identify_contract_types_from_transfers(
    client: &reqwest::Client,
    events: Vec<HashMap<String, Value>>,
    dynamo_client: &DynamoClient,
    kinesis_client: &KinesisClient,
) {
    // TODO: move to env file
    dotenv().ok();
    let is_dev = match env::var("IS_DEV") {
        Ok(val) => match val.to_lowercase().as_str() {
            "true" | "1" => true,
            "false" | "0" | "" => false,
            _ => panic!("IS_DEV must be set to true or false"),
        },
        Err(_) => panic!("IS_DEV must be set"),
    };
    // Get dynamo table to work with
    let table =
        env::var("ARK_COLLECTIONS_TABLE_NAME").expect("ARK_COLLECTIONS_TABLE_NAME must be set");
    let kinesis_stream = env::var("KINESIS_STREAM_NAME").expect("KINESIS_STREAM_NAME must be set");

    // Init start time
    let start_time = Instant::now();

    for event in events {
        // Filter contract with most transactions from identification
        if let Some(from_address) = event.get("from_address").and_then(|addr| addr.as_str()) {
            if BLACKLIST.contains(&from_address) {
                continue;
            }
        }

        let json_event = serde_json::to_string(&event).unwrap();
        // Get contract address

        let contract_address = event.get("from_address").unwrap().as_str().unwrap();
        let block_number = event.get("block_number").unwrap().as_u64().unwrap();

        // check if contract present and is a NFT then send event to the kinesis stream

        // Check if contract present and type
        let contract_status = get_contract_status(dynamo_client, contract_address)
            .await
            .unwrap_or(None);

        if let Some(contract_type) = contract_status {
            if contract_type == "unknown" {
                continue; // If it's unknown, skip this iteration of the loop
            } else if contract_type == "erc721" || contract_type == "erc1155" {
                // TODO: use common function
                if is_dev {
                    process_transfers(client, dynamo_client, &json_event)
                        .await
                        .unwrap();
                } else {
                    send_to_kinesis(
                        kinesis_client,
                        kinesis_stream.as_str(),
                        "transfer",
                        &json_event,
                    )
                    .await
                    .unwrap();
                }
                continue; // After sending event, skip this iteration of the loop
            }
        }

        let token_uri_cairo_0 = get_contract_property_string(
            client,
            contract_address,
            "tokenURI",
            vec!["1", "0"],
            block_number,
        )
        .await;

        let token_uri = get_contract_property_string(
            client,
            contract_address,
            "token_uri",
            vec!["1", "0"],
            block_number,
        )
        .await;

        // Get uri
        let uri_result = get_contract_property_string(
            &client,
            contract_address,
            "uri",
            [].to_vec(),
            block_number,
        )
        .await;

        // Init contract type
        let mut contract_type = "unknown".to_string();
        if (token_uri_cairo_0 != "undefined" && !token_uri_cairo_0.is_empty())
            || (token_uri != "undefined" && !token_uri.is_empty())
        {
            contract_type = "erc721".to_string()
        } else if uri_result != "undefined" {
            contract_type = "erc1155".to_string()
        }

        let collection_item = CollectionItem {
            address: contract_address.to_string(),
            contract_type: contract_type.clone(),
        };

        match add_collection_item(dynamo_client, collection_item, &table).await {
            Ok(success) => {
                info!(
                    "[Success] New collection item added successfully.\n\
                    - Item Details: {:?}\n\
                    - Table: {}",
                    success, &table
                );

                if contract_type != "unknown" {
                    // TODO: use common function
                    if is_dev {
                        process_transfers(client, dynamo_client, &json_event)
                            .await
                            .unwrap();
                    } else {
                        send_to_kinesis(
                            kinesis_client,
                            kinesis_stream.as_str(),
                            "transfer",
                            &json_event,
                        )
                        .await
                        .unwrap();
                    }
                }
            }
            Err(e) => {
                eprintln!(
                    "[Error] Failed to add a new item to the collection.\n\
                    - Error Details: {:?}\n\
                    - Target Table: {}",
                    e, &table
                );
            }
        }
    }
    let duration = start_time.elapsed();
    println!("Time elapsed in contracts block is: {:?}", duration);
}
