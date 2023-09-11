use anyhow::Result;
use starknet::core::types::EmittedEvent;

use crate::event_manager::EventManager;
use crate::storage_manager::DefaultStorage;
use crate::token_manager::TokenManager;

pub async fn process_transfers(
    event: &EmittedEvent,
    contract_type: &str,
    timestamp: u64,
) -> Result<()> {
    let storage_manager = DefaultStorage::new();

    let mut token_manager = TokenManager::new(&storage_manager);
    let mut event_manager = EventManager::new(&storage_manager);

    event_manager.format_event(event, contract_type, timestamp)?;
    
    let token_event = event_manager.get_event();
    token_manager.format_token_from_event(token_event);
    
    token_manager.create_token()?;
    event_manager.create_event()?;

    token_manager.reset_token();
    event_manager.reset_event();
    Ok(())
}
