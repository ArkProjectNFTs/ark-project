use crate::constants::BLACKLIST;
use ark_db::collection::create::create_collection;
use ark_db::contract::get::get_contract;
use ark_starknet::client::get_contract_type;
use ark_starknet::collection_manager::CollectionManager;
use ark_transfers_v2::transfer::process_transfers;
use aws_sdk_dynamodb::Client as DynamoClient;
use log::{error, info, debug};
use reqwest::Client as ReqwestClient;
use starknet::core::types::EmittedEvent;
use std::collections::HashMap;
use std::env;
use std::error::Error;
use std::time::Instant;

// Identifies contract types based on events from ABIs, checks for their presence in a Redis server, and if not found, calls contract methods to determine the type, stores this information back in Redis, and finally prints the contract type.
pub async fn identify_contract_types_from_transfers(
    collection_manager: &CollectionManager,
    client: &ReqwestClient,
    events: &[EmittedEvent],
    dynamo_client: &DynamoClient,
    block_number: u64,
    contract_cache: &mut HashMap<String, Option<String>>,
) -> Result<(), Box<dyn Error>> {

    // Get dynamo table to work with
    let collections_table =
        env::var("ARK_COLLECTIONS_TABLE_NAME").expect("ARK_COLLECTIONS_TABLE_NAME must be set");

    // Get block timestamp
    let block_id = collection_manager
        .client
        .parse_block_id(block_number.to_string().as_str())
        .unwrap();
    let timestamp = collection_manager.client.block_time(block_id).await?;

    info!("timestamp: {}", timestamp);

    // // Iterate over events
    for event in events {
        let contract_address = format!("{:#064x}", &event.from_address);
        // Filter contract with most transactions from identification
        if BLACKLIST.contains(&contract_address.as_str()) {
            continue;
        }

        // Check cache before making a call to get_contract
        let contract_status = if let Some(cached_status) = contract_cache.get(&contract_address) {
            cached_status.clone()
        } else {
            let start_time = Instant::now();

            let result = get_contract(dynamo_client, &contract_address)
                .await
                .unwrap_or(None);

            let elapsed_time = start_time.elapsed();
            info!(
                "get_contract took {}.{:03} seconds for contract {}",
                elapsed_time.as_secs(),
                elapsed_time.subsec_millis(),
                contract_address
            );

            // Cache the result
            contract_cache.insert(contract_address.clone(), result.clone());
            result
        };
        if let Some(existing_contract_type) = contract_status {
            if existing_contract_type == "unknown" {
                continue; // If it's unknown, skip this iteration of the loop
            } else if existing_contract_type == "erc721" || existing_contract_type == "erc1155" {
                match process_transfers(&event, existing_contract_type.as_str(), timestamp).await {
                    Ok(_) => {}
                    Err(e) => {
                        error!("Failed to process transfer: {:?}", e);
                        continue;
                    }
                }
                // After processing the event, skip this iteration of the loop
                continue;
            }
        }

        info!("CONTRACT NOT IDENTIFIED: {:?}", contract_address);
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
                    match process_transfers(&event, contract_type.as_str(), timestamp).await {
                        Ok(_) => {}
                        Err(e) => {
                            error!("Failed to process transfer: {:?}", e);
                            continue;
                        }
                    }
                    continue;
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

    Ok(())
}
