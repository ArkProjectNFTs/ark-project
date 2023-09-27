use crate::storage::storage_manager::StorageManager;
use crate::storage::types::{EventType, TokenEvent, TokenId};
use crate::ContractType;
use anyhow::{anyhow, Result};
use log::info;
use starknet::core::types::{EmittedEvent, FieldElement};
use starknet::core::utils::starknet_keccak;
use starknet::macros::selector;
use std::sync::Arc;

const TRANSFER_SELECTOR: FieldElement = selector!("Transfer");

#[derive(Debug)]
pub struct EventManager<S: StorageManager> {
    storage: Arc<S>,
    token_event: TokenEvent,
}

impl<S: StorageManager> EventManager<S> {
    /// Initializes a new instance.
    pub fn new(storage: Arc<S>) -> Self {
        EventManager {
            storage: Arc::clone(&storage),
            token_event: TokenEvent::default(),
        }
    }

    /// Returns the selectors used to filter events.
    pub fn keys_selector(&self) -> Option<Vec<Vec<FieldElement>>> {
        Some(vec![vec![TRANSFER_SELECTOR]])
    }

    /// Formats & register a token event based on the event content.
    /// Returns the token_id if the event were identified.
    pub async fn format_and_register_event(
        &self,
        event: &EmittedEvent,
        contract_type: ContractType,
        timestamp: u64,
    ) -> Result<TokenEvent> {
        let mut token_event = TokenEvent::default();

        // As cairo didn't have keys before, we first check if the data
        // contains the info. If not, we check into the keys, skipping the first
        // element which is the selector.
        let event_info = if let Some(d_info) = Self::get_event_info_from_felts(&event.data) {
            d_info
        } else if let Some(k_info) = Self::get_event_info_from_felts(&event.keys[1..]) {
            k_info
        } else {
            return Err(anyhow!("Can't find event data into this event"));
        };

        let (from, to, token_id) = event_info;

        token_event.from_address_field_element = from;
        token_event.to_address_field_element = to;
        token_event.contract_address = format!("{:#064x}", event.from_address);
        token_event.transaction_hash = format!("{:#064x}", event.transaction_hash);
        token_event.token_id = token_id.clone();
        token_event.formated_token_id = token_event.token_id.format();
        token_event.block_number = event.block_number;
        token_event.timestamp = timestamp;
        token_event.contract_type = contract_type.to_string();
        token_event.event_type = Self::get_event_type(from, to);
        token_event.event_id = Self::get_event_id_as_field_element(&token_event);

        info!("Event identified: {:?}", token_event.event_type);
        self.storage
            .register_event(&token_event, event.block_number)
            .await?;

        Ok(token_event.clone())
    }

    pub fn get_event_type(from: FieldElement, to: FieldElement) -> EventType {
        if from == FieldElement::ZERO {
            EventType::Mint
        } else if to == FieldElement::ZERO {
            EventType::Burn
        } else {
            EventType::Transfer
        }
    }

    /// Returns the event id as a field element.
    pub fn get_event_id_as_field_element(token_event: &TokenEvent) -> FieldElement {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&token_event.token_id.low.to_bytes_be());
        bytes.extend_from_slice(&token_event.token_id.high.to_bytes_be());
        bytes.extend_from_slice(&token_event.from_address_field_element.to_bytes_be());
        bytes.extend_from_slice(&token_event.to_address_field_element.to_bytes_be());
        bytes.extend_from_slice(token_event.contract_address.as_bytes());
        bytes.extend_from_slice(token_event.transaction_hash.as_bytes());
        bytes.extend_from_slice(&token_event.block_number.to_le_bytes());
        starknet_keccak(&bytes)
    }

    /// Returns the event info from vector of felts.
    /// Event info are (from, to, token_id).
    ///
    /// This methods considers that the info of the
    /// event is starting at index 0 of the input vector.
    fn get_event_info_from_felts(
        felts: &[FieldElement],
    ) -> Option<(FieldElement, FieldElement, TokenId)> {
        if felts.len() < 4 {
            return None;
        }
        let from = felts[0];
        let to = felts[1];

        let token_id = TokenId {
            low: felts[2],
            high: felts[3],
        };

        Some((from, to, token_id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::storage_manager::MockStorageManager;

    #[test]
    fn test_keys_selector() {
        let mock_storage = Arc::new(MockStorageManager::default());
        let event_manager = EventManager::<MockStorageManager>::new(mock_storage);

        let selectors = event_manager.keys_selector().unwrap();
        assert_eq!(selectors[0][0], TRANSFER_SELECTOR);
    }

    #[test]
    fn test_get_event_type() {
        let mint_event = EventManager::<MockStorageManager>::get_event_type(
            FieldElement::ZERO,
            FieldElement::from_dec_str("1").unwrap(),
        );
        assert_eq!(mint_event, EventType::Mint);

        let burn_event = EventManager::<MockStorageManager>::get_event_type(
            FieldElement::from_dec_str("1").unwrap(),
            FieldElement::ZERO,
        );
        assert_eq!(burn_event, EventType::Burn);

        let transfer_event = EventManager::<MockStorageManager>::get_event_type(
            FieldElement::from_dec_str("1").unwrap(),
            FieldElement::from_dec_str("2").unwrap(),
        );
        assert_eq!(transfer_event, EventType::Transfer);
    }

    #[test]
    fn test_get_event_info_from_felts() {
        let felts = vec![
            FieldElement::from_dec_str("1").unwrap(),
            FieldElement::from_dec_str("2").unwrap(),
            FieldElement::from_dec_str("3").unwrap(),
            FieldElement::from_dec_str("4").unwrap(),
        ];

        let result = EventManager::<MockStorageManager>::get_event_info_from_felts(&felts);

        assert!(result.is_some());
        let (field1, field2, token_id) = result.unwrap();

        assert_eq!(field1, FieldElement::from_dec_str("1").unwrap());
        assert_eq!(field2, FieldElement::from_dec_str("2").unwrap());
        assert_eq!(token_id.low, FieldElement::from_dec_str("3").unwrap());
        assert_eq!(token_id.high, FieldElement::from_dec_str("4").unwrap());
    }
}
