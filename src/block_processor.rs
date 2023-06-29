use crate::constants::BLACKLIST;
use crate::dynamo::create::{add_collection_item, Item};
use crate::starknet::client::{fetch_block, get_latest_block};
use crate::starknet::utils::get_contract_property;
use crate::utils::{extract_events, filter_transfer_events, get_selector_from_name};
use aws_sdk_dynamodb::Client as DynamoClient;
use dotenv::dotenv;
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use std::env;
use std::time::Duration;
use std::time::Instant;
use tokio::time::sleep;

// Identifies contract types based on events from ABIs, checks for their presence in a Redis server, and if not found, calls contract methods to determine the type, stores this information back in Redis, and finally prints the contract type.
async fn identify_contract_types_from_transfers(
    client: &Client,
    events: Vec<HashMap<String, Value>>,
    dynamo_client: &DynamoClient,
) {
    // Get dynamo table to work with
    dotenv().ok();
    let table = env::var("DYNAMO_TABLE_NAME").expect("DYNAMO_TABLE must be set");

    // Init start time
    let start_time = Instant::now();

    for event in events {
        // Filter contract with most transactions from identification
        if let Some(from_address) = event.get("from_address").and_then(|addr| addr.as_str()) {
            if BLACKLIST.contains(&from_address) {
                continue;
            }
        }

        // Get contract address
        let from_address = event.get("from_address").unwrap().as_str().unwrap();

        // TODO: optimize by also saving the other types of contract and create a condition to skip them after

        // Get token_uri
        let token_uri_result =
            get_contract_property(&client, &event, "tokenURI", ["1", "0"].to_vec(), false).await;

        // Get uri
        let uri_result = get_contract_property(&client, &event, "uri", [].to_vec(), false).await;

        // Init contract type
        let mut contract_type = "unknown".to_string();

        // Determine the contract type
        if token_uri_result != "null" {
            contract_type = "erc721".to_string();
        } else if uri_result != "null" {
            contract_type = "erc1155".to_string();
        }

        if contract_type != "unknown" {
            // call to get collection informations
            let name = get_contract_property(&client, &event, "name", [].to_vec(), true).await;
            // TODO in case we don't have supply optimize by counting the total number of minted tokens
            let supply = get_contract_property(&client, &event, "totalSupply", [].to_vec(), true).await;
            let symbol = get_contract_property(&client, &event, "symbol", [].to_vec(), true).await;

            let item = Item {
                name,
                total_supply: supply.to_string(),
                symbol: symbol.to_string(),
                address: from_address.to_string(),
                contract_deployer: "0x1234...".to_string(),
                deployed_block_number: "1234567".to_string(),
                contract_type: contract_type.clone(), // Assign the determined contract type here
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
    println!(
        "Time elapsed in process_non_blacklisted_events is: {:?}",
        duration
    );
}

// This function extracts and filters transfer events from a blockchain block, and subsequently identifies and categorizes contract types involved in these transfers, maintaining an exclusion list for blacklisted contracts.
async fn get_transfer_events(
    client: &Client,
    block: HashMap<String, Value>,
    dynamo_client: &DynamoClient,
) -> () {
    let event_hash = get_selector_from_name("Transfer");

    let events = extract_events(&block);
    let transfer_events = filter_transfer_events(events, &event_hash);

    identify_contract_types_from_transfers(client, transfer_events, dynamo_client).await;
}

// This function continually fetches and processes blockchain blocks as they are mined, maintaining pace with the most recent block, extracting transfer events from each, and then pausing if it catches up, ensuring a continuous and up-to-date data stream.
pub async fn get_blocks(
    reqwest_client: &Client,
    dynamo_client: &DynamoClient,
) -> Result<(), Box<dyn std::error::Error>> {
    // Set starting block
    let mut current_block_number: u64 = 90000;
    // Loop Through Blocks and wait for new blocks
    loop {
        let latest_block_number = get_latest_block(&reqwest_client).await?;
        println!("Latest block: {}", latest_block_number);
        println!("Current block: {}", current_block_number);
        if current_block_number <= latest_block_number {
            let block = fetch_block(&reqwest_client, current_block_number).await;
            get_transfer_events(&reqwest_client, block.unwrap(), &dynamo_client).await;
            current_block_number += 1;
        } else {
            sleep(Duration::from_secs(10)).await;
        }
    }
}
