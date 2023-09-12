use crate::constants::BLACKLIST;
use crate::managers::{
    collection_manager::CollectionManager, event_manager::EventManager, token_manager::TokenManager,
};
use crate::transfer::process_transfer;
use ark_db::collection::create::create_collection;
use ark_db::contract::get::get_contract;
use ark_starknet::client::get_contract_type;
use ark_storage::storage_manager::StorageManager;
use aws_sdk_dynamodb::Client as DynamoClient;
use log::{debug, error, info};
use reqwest::Client as ReqwestClient;
use starknet::core::types::EmittedEvent;
use std::collections::HashMap;
use std::env;
use std::error::Error;
use std::time::Instant;

// Identifies contract types based on events from ABIs, checks for their presence in a Redis server, and if not found, calls contract methods to determine the type, stores this information back in Redis, and finally prints the contract type.
pub async fn identify_contract_types_from_transfers<'a, T: StorageManager>(
    collection_manager: &CollectionManager,
    client: &ReqwestClient,
    events: &[EmittedEvent],
    dynamo_client: &DynamoClient,
    block_number: u64,
    contract_cache: &mut HashMap<String, Option<String>>,
    token_manager: &mut TokenManager<'a, T>,
    event_manager: &mut EventManager<'a, T>,
) -> Result<(), Box<dyn Error>> {
    let start_time = Instant::now();

    // Get dynamo table to work with
    let collections_table =
        env::var("ARK_COLLECTIONS_TABLE_NAME").expect("ARK_COLLECTIONS_TABLE_NAME must be set");

    // Get block timestamp
    let block_id = collection_manager
        .client
        .parse_block_id(block_number.to_string().as_str())
        .unwrap();
    let timestamp = collection_manager.client.block_time(block_id).await?;

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
            let result = get_contract(dynamo_client, &contract_address)
                .await
                .unwrap_or(None);

            // Cache the result
            contract_cache.insert(contract_address.clone(), result.clone());
            result
        };

        if let Some(existing_contract_type) = contract_status {
            if existing_contract_type == "unknown" {
                continue; // If it's unknown, skip this iteration of the loop
            } else if existing_contract_type == "erc721" || existing_contract_type == "erc1155" {
                match process_transfer(
                    &event,
                    existing_contract_type.as_str(),
                    timestamp,
                    token_manager,
                    event_manager,
                )
                .await
                {
                    Ok(_) => {}
                    Err(e) => {
                        error!("Failed to process transfer: {:?}", e);
                        continue;
                    }
                }
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
                    match process_transfer(
                        &event,
                        contract_type.as_str(),
                        timestamp,
                        token_manager,
                        event_manager,
                    )
                    .await
                    {
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

    let elapsed_time = start_time.elapsed();
    info!(
        "Event loop took {}.{:03} seconds for block {}",
        elapsed_time.as_secs(),
        elapsed_time.subsec_millis(),
        block_number
    );

    Ok(())
}
