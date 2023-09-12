use super::contract::identify_contract_types_from_transfers;
use anyhow::Result;
use ark_db::indexer::get::{get_block, get_indexer_sk};
use ark_db::indexer::update::{update_block, update_indexer};
use ark_starknet::collection_manager::CollectionManager;
use ark_transfers_v2::{
    event_manager::EventManager, storage_manager::StorageManager, token_manager::TokenManager,
};
use aws_sdk_dynamodb::Client as DynamoClient;
use chrono::Utc;
use log::{error, info};
use reqwest::Client as ReqwestClient;
use starknet::core::types::{BlockId, EmittedEvent};
use starknet::core::utils::get_selector_from_name;
use std::collections::HashMap;
use std::env;
use std::time::{Duration, Instant};
use tokio::time::sleep;
use tracing::{span, Level};

// Helper function to determine the destination block number
async fn get_destination_block_number(
    collection_manager: &CollectionManager,
) -> Result<u64, env::VarError> {
    match env::var("END_BLOCK") {
        Ok(val) => Ok(val.parse::<u64>().unwrap()),
        Err(_) => collection_manager
            .client
            .block_number()
            .await
            .map_err(|_| env::VarError::NotPresent),
    }
}

// Helper function to fetch and filter only transfer events from a block
async fn get_transfer_events(
    collection_manager: &CollectionManager,
    block_number: u64,
) -> Result<Option<Vec<EmittedEvent>>> {
    let span = span!(Level::TRACE, "get_transfer_events");
    let _enter = span.enter();

    let events = &collection_manager
        .client
        .fetch_events(
            BlockId::Number(block_number),
            BlockId::Number(block_number),
            None,
        )
        .await?;

    if let Some(block_events) = events.get(&block_number) {
        Ok(Some(
            block_events
                .clone()
                .into_iter()
                .filter(|e| {
                    e.keys.get(0).map_or(false, |key| {
                        *key == get_selector_from_name("Transfer").unwrap()
                    })
                })
                .collect(),
        ))
    } else {
        Ok(None)
    }
}

pub async fn process_blocks_continuously<'a, T: StorageManager>(
    collection_manager: &CollectionManager,
    reqwest_client: &ReqwestClient,
    dynamo_client: &DynamoClient,
    ecs_task_id: &str,
    is_continous: bool,
    token_manager: &mut TokenManager<'a, T>,
    event_manager: &mut EventManager<'a, T>,
) -> Result<()> {
    let starting_block = env::var("START_BLOCK")
        .expect("START_BLOCK must be set")
        .parse::<u64>()
        .unwrap();

    let mut current_block_number: u64 = starting_block;
    let mut contract_cache: HashMap<String, Option<String>> = HashMap::new();

    let indexer_sk = match get_indexer_sk(dynamo_client, ecs_task_id).await {
        Ok(indexer_sk) => indexer_sk,
        Err(_) => {
            let now = Utc::now();
            let unix_timestamp = now.timestamp();
            format!("TASK#{}#{}", unix_timestamp, ecs_task_id)
        }
    };

    loop {
        // Start a span for the current block
        let span = span!(
            Level::TRACE,
            "Block loop ",
            block = current_block_number
        );
        let _enter = span.enter();

        let execution_time = Instant::now();
        let dest_block_number = get_destination_block_number(collection_manager).await?;
        let indexation_progress = (current_block_number as f64 / dest_block_number as f64) * 100.0;

        info!(
            "Dest block: {}, Current block: {}, Indexing progress: {:.2}%",
            dest_block_number, current_block_number, indexation_progress
        );

        if !is_continous {
            update_indexer(
                dynamo_client,
                ecs_task_id,
                indexer_sk.as_str(),
                "running".to_string(),
                starting_block,
                dest_block_number,
                indexation_progress as u64,
            )
            .await?;
        }

        // If the current block number is less than or equal to the destination block number
        if current_block_number <= dest_block_number {
            let is_block_fetched = get_block(dynamo_client, current_block_number).await?;

            // Skip already fetched blocks
            if is_block_fetched {
                info!("Current block {} is already fetched", current_block_number);
                current_block_number += 1;
                continue;
            }

            if let Some(events_only) =
                get_transfer_events(collection_manager, current_block_number).await?
            {
                info!(
                    "{:?} events to process for block {:?}",
                    events_only.len(),
                    current_block_number
                );

                match identify_contract_types_from_transfers(
                    collection_manager,
                    reqwest_client,
                    &events_only,
                    dynamo_client,
                    current_block_number,
                    &mut contract_cache,
                    token_manager,
                    event_manager,
                )
                .await
                {
                    Ok(_) => {
                        update_block(dynamo_client, ecs_task_id, current_block_number).await?;
                        info!(
                            "Indexing time: {}ms (block {})",
                            execution_time.elapsed().as_millis(),
                            current_block_number
                        );
                        current_block_number += 1;
                    }
                    Err(_err) => {
                        error!("Error processing block: {:?}", current_block_number);
                        break;
                    }
                }
            } else {
                info!("No event to process for block {:?}", current_block_number);
                update_block(dynamo_client, ecs_task_id, current_block_number).await?;
                current_block_number += 1;
            }
        } else if !is_continous {
            break;
        } else {
            sleep(Duration::from_secs(1)).await;
        }
    }

    if !is_continous {
        update_indexer(
            dynamo_client,
            ecs_task_id,
            &indexer_sk,
            String::from("stopped"),
            starting_block,
            current_block_number,
            100,
        )
        .await?;
    }

    Ok(())
}
