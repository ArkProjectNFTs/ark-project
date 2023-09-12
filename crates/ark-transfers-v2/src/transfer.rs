use anyhow::Result;
use starknet::core::types::EmittedEvent;
use crate::token_manager::TokenManager;
use crate::event_manager::EventManager;
use crate::storage_manager::StorageManager;

pub async fn process_transfers<'a, T: StorageManager>(
    event: &EmittedEvent,
    contract_type: &str,
    timestamp: u64,
    token_manager: &mut TokenManager<'a, T>,
    event_manager: &mut EventManager<'a, T>
) -> Result<()> {

    event_manager.format_event(event, contract_type, timestamp)?;
    event_manager.create_event()?;

    let token_event = event_manager.get_event();
    token_manager.format_token_from_event(token_event);
    
    token_manager.create_token()?;

    token_manager.reset_token();
    event_manager.reset_event();
    Ok(())
}
