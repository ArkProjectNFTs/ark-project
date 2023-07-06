use crate::arkindexer::contract_status::get_contract_status;
use crate::constants::BLACKLIST;
use crate::dynamo::create::{add_collection_item, Item};
use crate::kinesis::send::send_to_kinesis;
use crate::starknet::utils::get_contract_property;
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_kinesis::Client as KinesisClient;
use dotenv::dotenv;
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use std::env;
use std::time::Instant;

// Identifies contract types based on events from ABIs, checks for their presence in a Redis server, and if not found, calls contract methods to determine the type, stores this information back in Redis, and finally prints the contract type.
pub async fn identify_contract_types_from_transfers(
    client: &Client,
    events: Vec<HashMap<String, Value>>,
    dynamo_client: &DynamoClient,
    kinesis_client: &KinesisClient,
) {
    // Get dynamo table to work with
    dotenv().ok();
    let table =
        env::var("ARK_COLLECTIONS_TABLE_NAME").expect("ARK_COLLECTIONS_TABLE_NAME must be set");
    let kinesis_stream = env::var("KINESIS_STREAM_NAME").expect("KINESIS_STREAM_NAME must be set");

    // Init start time
    let start_time = Instant::now();

    for event in events {
        // Check if the "from_address" field is present and is not in the blacklist
        if let Some(from_address) = event.get("from_address").and_then(|addr| addr.as_str()) {
            if BLACKLIST.contains(&from_address) {
                println!("Skipping blacklisted address: {:?}", from_address);
                continue;
            }
            let json_event = match serde_json::to_string(&event) {
                Ok(je) => je,
                Err(e) => {
                    println!("Error converting event to JSON: {:?}", e);
                    continue;
                }
            };

            println!("Processing event: {:?}", json_event);

            // Check contract status
            match get_contract_status(&dynamo_client, from_address).await {
                Ok(Some(contract_type))
                    if contract_type == "erc721" || contract_type == "erc1155" =>
                {
                    let partition_key = format!("transfer-{}", from_address);
                    if let Err(e) = send_to_kinesis(
                        &kinesis_client,
                        &kinesis_stream,
                        &partition_key,
                        &json_event,
                    )
                    .await
                    {
                        eprintln!("Error while sending to Kinesis: {:?}", e);
                    }
                }
                Ok(Some("unknown")) | Err(_) | Ok(None) => {
                    println!("Skipping unknown contract at address: {:?}", from_address);
                    continue;
                }
                _ => {}
            }

            let token_uri_result =
                get_contract_property(&client, &event, "tokenURI", ["1", "0"].to_vec(), false)
                    .await;
            let uri_result =
                get_contract_property(&client, &event, "uri", [].to_vec(), false).await;

            let contract_type = if token_uri_result != "null" {
                "erc721".to_string()
            } else if uri_result != "null" {
                "erc1155".to_string()
            } else {
                println!("Contract type is unknown, skipping fetch assigning default values");
                "unknown".to_string()
            };

            let (name, supply, symbol) = if contract_type != "unknown" {
                // Check if it's a NFT, then send the event to the kinesis stream
                if let Err(e) =
                    send_to_kinesis(&kinesis_client, &kinesis_stream, "transfer", "data").await
                {
                    eprintln!("Error while sending to Kinesis: {:?}", e);
                }
                let name = get_contract_property(&client, &event, "name", [].to_vec(), true).await;
                let supply =
                    get_contract_property(&client, &event, "totalSupply", [].to_vec(), true).await;
                let symbol =
                    get_contract_property(&client, &event, "symbol", [].to_vec(), true).await;
                (name, supply.to_string(), symbol.to_string())
            } else {
                // Assign default values for unknown contract types
                (
                    "Unknown name".to_string(),
                    "0".to_string(),
                    "Unknown symbol".to_string(),
                )
            };

            let item = Item {
                name,
                total_supply: supply,
                symbol,
                address: from_address.to_string(),
                contract_deployer: "0x1234...".to_string(),
                deployed_block_number: "1234567".to_string(),
                contract_type: contract_type.clone(),
            };
            match add_collection_item(&dynamo_client, item, &table).await {
                Ok(collection) => {
                    println!(
                        "Collection successfully added: {:?} {}, type: {}",
                        collection, from_address, contract_type
                    );
                }
                Err(e) => {
                    eprintln!("Error while adding collection: {:?}", e);
                }
            }
        }
    }
    let duration = start_time.elapsed();
    println!("Time elapsed in contracts block is: {:?}", duration);
}
