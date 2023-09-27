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
    use ark_starknet::client::MockStarknetClient;

    /// Sets up sample data and event for testing purposes.
    fn setup_sample_event() -> EmittedEvent {
        EmittedEvent {
            from_address: FieldElement::from_hex_be("0x0").unwrap(),
            block_hash: FieldElement::from_dec_str("786").unwrap(),
            transaction_hash: FieldElement::from_dec_str("5432").unwrap(),
            block_number: 111,
            keys: vec![
                TRANSFER_SELECTOR,
                FieldElement::from_dec_str("1234").unwrap(),
                FieldElement::from_dec_str("5678").unwrap(),
            ],
            data: vec![
                FieldElement::from_dec_str("1234").unwrap(),
                FieldElement::from_dec_str("5678").unwrap(),
                FieldElement::from_dec_str("91011").unwrap(),
                FieldElement::from_dec_str("121314").unwrap(),
            ],
        }
    }

    #[tokio::test]
    async fn test_format_event_successfully() {
        let storage = MockStorageManager::default();

        // storage
        //     .expect_register_event()
        //     .returning(|_, _| Ok());

        // TODO: we can't test a future with automock, we need to use mock!.
        // https://github.com/asomers/mockall/issues/189#issuecomment-683788750

        let manager = EventManager::new(Arc::new(storage));

        let sample_event = setup_sample_event();
        let contract_type = ContractType::ERC721;
        let timestamp = 1234567890;

        let result = manager
            .format_and_register_event(&sample_event, contract_type, timestamp)
            .await;

        assert!(result.is_ok());

        let token_event = result.unwrap();

        println!("===> {}", token_event.from_address_field_element);

        assert_eq!(
            token_event.from_address_field_element,
            FieldElement::from_dec_str("1234").unwrap()
        );
    }

    #[tokio::test]
    async fn test_format_event_data_extraction_from_data() {

        return;
        // Initialize a MockStorageManager and the EventManager
        let storage = Arc::new(MockStorageManager::default());
        let mut manager = EventManager::new(storage.clone());

        // Construct an event where the event data is only present in `event.data`
        // and not in `event.keys`.
        let sample_event = EmittedEvent {
            from_address: FieldElement::from_hex_be("0x0").unwrap(),
            block_hash: FieldElement::from_dec_str("786").unwrap(),
            transaction_hash: FieldElement::from_dec_str("5432").unwrap(),
            block_number: 111,
            keys: vec![
                TRANSFER_SELECTOR, // This is the selector, so it's not used to extract event data
            ],
            data: vec![
                FieldElement::from_dec_str("1234").unwrap(),   // from
                FieldElement::from_dec_str("5678").unwrap(),   // to
                FieldElement::from_dec_str("91011").unwrap(),  // token_id_low
                FieldElement::from_dec_str("121314").unwrap(), // token_id_high
            ],
        };

        let contract_type = ContractType::ERC721;
        let timestamp = 1234567890;

        // Call the `format_event` function
        let result = manager
            .format_and_register_event(&sample_event, contract_type, timestamp)
            .await;

        // Assertions
        assert!(result.is_ok());
        let token_event = result.unwrap();

        // Check if the extracted data matches the data from `event.data`
        assert_eq!(
            token_event.from_address_field_element,
            FieldElement::from_dec_str("1234").unwrap()
        );
        assert_eq!(
            token_event.to_address_field_element,
            FieldElement::from_dec_str("5678").unwrap()
        );
        assert_eq!(
            token_event.token_id.low,
            FieldElement::from_dec_str("91011").unwrap()
        );
        assert_eq!(
            token_event.token_id.high,
            FieldElement::from_dec_str("121314").unwrap()
        );
    }

    #[test]
    fn test_keys_selector() {
        let storage = Arc::new(MockStorageManager::default());
        let manager = EventManager::new(storage);

        // Call the method
        let result = manager.keys_selector().unwrap();

        // Define expected result
        let expected = vec![vec![selector!("Transfer")]];

        // Assert the output
        assert_eq!(result, expected);
    }

    /// Tests the `get_event_info_from_felts` method with correct input format and length.
    /// Ensures that the method correctly extracts and returns the event info.
    #[test]
    fn test_get_event_info_from_felts() {
        // Create sample data for the test
        let from_value = FieldElement::from_dec_str("1234").unwrap();
        let to_value = FieldElement::from_dec_str("5678").unwrap();
        let token_id_low = FieldElement::from_dec_str("91011").unwrap();
        let token_id_high = FieldElement::from_dec_str("121314").unwrap();

        let sample_data = vec![from_value, to_value, token_id_low, token_id_high];

        // Call the method
        let result = EventManager::<MockStorageManager>::get_event_info_from_felts(&sample_data);

        // Assert the output
        assert_eq!(result.is_some(), true);
        let (from, to, token_id) = result.unwrap();
        assert_eq!(from, from_value);
        assert_eq!(to, to_value);
        assert_eq!(token_id.low, token_id_low);
        assert_eq!(token_id.high, token_id_high);
    }

    /// Tests the `get_event_info_from_felts` method with insufficient FieldElements.
    /// Ensures that the method returns None when not provided enough data.
    #[test]
    fn test_get_event_info_from_felts_insufficient_data() {
        // Create sample data for the test with insufficient FieldElements
        let sample_data = vec![
            FieldElement::from_dec_str("1234").unwrap(),
            FieldElement::from_dec_str("5678").unwrap(),
        ];

        // Call the method
        let result = EventManager::<MockStorageManager>::get_event_info_from_felts(&sample_data);

        // Assert the output
        assert_eq!(result.is_none(), true);
    }
}
