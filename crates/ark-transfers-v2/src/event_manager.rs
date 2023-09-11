use crate::storage_manager::storage_manager::StorageManager;
use crate::types::EventType;
use crate::types::TokenEvent;
use anyhow::{anyhow, Result};
use ark_starknet::utils::TokenId;
use log::info;
use starknet::core::types::{EmittedEvent, FieldElement};

#[derive(Debug)]
pub struct EventManager<'a, T: StorageManager> {
    storage: &'a T,
    token_event: TokenEvent,
}

impl<'a, T: StorageManager> EventManager<'a, T> {
    pub fn new(storage: &'a T) -> Self {
        EventManager {
            storage,
            token_event: TokenEvent::default(),
        }
    }

    pub fn reset_event(&mut self) {
        self.token_event = TokenEvent::default();
    }

    pub fn format_event(
        &mut self,
        event: &EmittedEvent,
        contract_type: &str,
        timestamp: u64,
    ) -> Result<()> {
        if event.data.len() < 4 {
            return Err(anyhow!("Invalid event data"));
        }

        self.token_event.from_address_field_element = event.data[0];
        self.token_event.from_address = format!("{:#064x}", event.data[0]);
        self.token_event.to_address_field_element = event.data[1];
        self.token_event.to_address = format!("{:#064x}", event.data[1]);
        self.token_event.contract_address = format!("{:#064x}", event.from_address);
        self.token_event.transaction_hash = format!("{:#064x}", event.transaction_hash);
        self.token_event.token_id = TokenId {
            low: event.data[2],
            high: event.data[3],
        };
        self.token_event.formated_token_id = self.token_event.token_id.format();
        self.token_event.block_number = event.block_number;
        self.token_event.timestamp = timestamp;
        self.token_event.contract_type = contract_type.to_string();
        self.token_event.event_type = self.get_event_type();
        Ok(())
    }

    pub fn get_event(&self) -> &TokenEvent {
        &self.token_event
    }

    pub fn get_event_type(&mut self) -> EventType {
        if self.token_event.from_address_field_element == FieldElement::ZERO {
            info!("EVENT MANAGER: Mint detected");
            EventType::Mint
        } else if self.token_event.to_address_field_element == FieldElement::ZERO {
            info!("EVENT MANAGER: Burn detected");
            EventType::Burn
        } else {
            info!("EVENT MANAGER: Transfer detected");
            EventType::Transfer
        }
    }

    pub fn create_event(&self) -> Result<()> {
        self.storage.create_event(&self.token_event);
        Ok(())
    }
}
