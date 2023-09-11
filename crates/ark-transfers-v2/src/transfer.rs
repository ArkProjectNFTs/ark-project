use anyhow::{anyhow, Result};
use ark_starknet::utils::TokenId;
use log::{debug, info, warn};
use starknet::core::types::{EmittedEvent, FieldElement};
use std::sync::{Arc, Mutex};

// use super::token_manager::TokenManager;
// use super::storage_manager::StorageManager;
use super::event_manager::EventManager;

pub async fn process_transfers(
    event: &EmittedEvent,
    contract_type: &str,
    timestamp: u64,
) -> Result<()> {
    let mut event_manager = EventManager::new();
    event_manager.format_event(event, contract_type, timestamp)?;
    let event_formatted_data = event_manager.get_self();

    info!("event_formatted_data: {:?}", event_formatted_data);

    if event_formatted_data.from_address_field_element == FieldElement::ZERO {
        info!("Mint detected");
    } else {
        info!("Transfer detected");
    }

    // let token_manager = TokenManager::new();
    // let storage_manager = TokenManager::new();

    Ok(())
}
