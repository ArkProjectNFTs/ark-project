use crate::managers::event_manager::EventManager;
use crate::managers::token_manager::TokenManager;
use anyhow::Result;
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::EventType;
use starknet::core::types::EmittedEvent;

pub async fn process_transfer<'a, T: StorageManager>(
    event: &EmittedEvent,
    contract_type: &str,
    timestamp: u64,
    token_manager: &mut TokenManager<'a, T>,
    event_manager: &mut EventManager<'a, T>,
) -> Result<()> {
    event_manager.format_event(event, contract_type, timestamp)?;
    event_manager.create_event()?;

    let token_event = event_manager.get_event();
    token_manager.format_token_from_event(token_event);

    if token_event.event_type == EventType::Mint {
        token_manager.create_token()?;
    } else {
        // TODO update token owner
        // token_manager.update_token_owner()?;
    }

    token_manager.reset_token();
    event_manager.reset_event();
    Ok(())
}
