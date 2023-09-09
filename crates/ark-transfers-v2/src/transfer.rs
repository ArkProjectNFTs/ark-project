use anyhow::{anyhow, Result};
use ark_starknet::utils::TokenId;
use log::{debug, info, warn};
use starknet::core::types::EmittedEvent;
use std::sync::{Arc, Mutex};
// use super::token_manager::TokenManager;
// use super::storage_manager::StorageManager;
use super::event_manager::EventManager;

#[derive(Debug)]
struct ProcessedEvent {
    timestamp: u64,
    from_address: String,
    to_address: String,
    contract_address: String,
    transaction_hash: String,
    token_id: TokenId,
    formated_token_id: String,
    block_number: u64,
}

struct SharedState {
    event_data: Arc<Mutex<Option<ProcessedEvent>>>,
}

pub async fn process_transfers(event: &EmittedEvent, contract_type: &str) -> Result<()> {
    let event_manager = EventManager::new(client, shared_state);
    // let event_data = event_manager.format_event(event)?;
    // let shared_state = SharedState::new(event_data);
    // let token_manager = TokenManager::new(shared_state);
    // let storage_manager = TokenManager::new(shared_state);

    info!("event: {:?}", event);
    Ok(())
}
