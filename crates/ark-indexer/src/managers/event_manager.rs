use crate::ContractType;
use anyhow::{anyhow, Result};
use ark_starknet::client::StarknetClient;
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::{EventType, TokenEvent, TokenId};
use log::info;
use starknet::core::types::{EmittedEvent, FieldElement};
use starknet::macros::selector;
use std::sync::Arc;

const TRANSFER_SELECTOR: FieldElement = selector!("Transfer");

#[derive(Debug)]
pub struct EventManager<T: StorageManager, C: StarknetClient> {
    storage: Arc<T>,
    client: Arc<C>,
    token_event: TokenEvent,
}

impl<T: StorageManager, C: StarknetClient> EventManager<T, C> {
    /// Initializes a new instance.
    pub fn new(storage: Arc<T>, client: Arc<C>) -> Self {
        EventManager {
            storage,
            token_event: TokenEvent::default(),
            client,
        }
    }

    /// Returns the selectors used to filter events.
    pub fn keys_selector(&self) -> Option<Vec<Vec<FieldElement>>> {
        Some(vec![vec![TRANSFER_SELECTOR]])
    }

    /// Formats a token event based on the event content.
    /// Returns the token_id if the event were identified,
    /// an Err otherwise.
    pub async fn format_event(
        &mut self,
        event: &EmittedEvent,
        contract_type: ContractType,
        timestamp: u64,
    ) -> Result<TokenEvent> {
        self.reset_event();

        // As cairo didn't have keys before, we first check if the data
        // contains the info. If not, we check into the keys, skipping the first
        // element which is the selector.
        let event_info = if let Some(d_info) = Self::get_event_info_from_felts(&event.data) {
            d_info
        } else if let Some(k_info) = Self::get_event_info_from_felts(&event.keys[1..]) {
            k_info
        } else {
            log::warn!("Can't find event data into this event");
            return Err(anyhow!("Can't format event"));
        };

        let (from, to, token_id) = event_info;

        // TODO: why do we need this entry 2 times for the felt and the string?
        // TODO move that to storage
        // self.token_event.from_address = format!("{:#064x}", from);
        // self.token_event.to_address = format!("{:#064x}", to);
        self.token_event.from_address_field_element = from;
        self.token_event.to_address_field_element = to;
        self.token_event.contract_address = format!("{:#064x}", event.from_address);
        self.token_event.transaction_hash = format!("{:#064x}", event.transaction_hash);
        self.token_event.token_id = token_id.clone();
        self.token_event.formated_token_id = self.token_event.token_id.format();
        self.token_event.block_number = event.block_number;
        self.token_event.timestamp = timestamp;
        self.token_event.contract_type = contract_type.to_string();
        self.token_event.event_type = Self::get_event_type(from, to);

        info!("Event identified: {:?}", self.token_event.event_type);

        self.storage.register_event(&self.token_event)?;

        Ok(self.token_event.clone())
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

    fn reset_event(&mut self) {
        self.token_event = TokenEvent::default();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ark_starknet::client::MockStarknetClient;
    use ark_storage::storage_manager::MockStorageManager;
    use starknet::core::types::{EmittedEvent, FieldElement};

    // /// Sets up sample data and event for testing purposes.
    // fn setup_sample_event() -> EmittedEvent {
    //     EmittedEvent {
    //         from_address: FieldElement::from_hex_be("0x0").unwrap(),
    //         block_hash: FieldElement::from_dec_str("786").unwrap(),
    //         transaction_hash: FieldElement::from_dec_str("5432").unwrap(),
    //         block_number: 111,
    //         keys: vec![
    //             TRANSFER_SELECTOR,
    //             FieldElement::from_dec_str("1234").unwrap(),
    //             FieldElement::from_dec_str("5678").unwrap(),
    //         ],
    //         data: vec![
    //             FieldElement::from_dec_str("1234").unwrap(),
    //             FieldElement::from_dec_str("5678").unwrap(),
    //             FieldElement::from_dec_str("91011").unwrap(),
    //             FieldElement::from_dec_str("121314").unwrap(),
    //         ],
    //     }
    // }

    // #[tokio::test]
    // async fn test_format_event_successfully() {

    //     let client = Arc::new(MockStarknetClient::default());
    //     let storage = Arc::new(MockStorageManager::default());
    //     let mut manager = EventManager::new(Arc::clone(&storage), Arc::clone(&client));

    //     let sample_event = setup_sample_event();
    //     let contract_type = ContractType::ERC721;
    //     let timestamp = 1234567890;

    //     let result = manager
    //         .format_event(&sample_event, contract_type, timestamp)
    //         .await;

    //     assert!(result.is_ok());

    //     let token_event = result.unwrap();

    //     println!("===> {}", token_event.from_address_field_element);

    //     assert_eq!(
    //         token_event.from_address_field_element,
    //         FieldElement::from_dec_str("1234").unwrap()
    //     );
    // }

    // #[tokio::test]
    // async fn test_format_event_data_extraction_from_data() {
    //     // Initialize a MockStorageManager and the EventManager
    //     let storage = Arc::new(MockStorageManager::default());
    //     let mut manager = EventManager::new(storage.clone());

    //     // Construct an event where the event data is only present in `event.data`
    //     // and not in `event.keys`.
    //     let sample_event = EmittedEvent {
    //         from_address: FieldElement::from_hex_be("0x0").unwrap(),
    //         block_hash: FieldElement::from_dec_str("786").unwrap(),
    //         transaction_hash: FieldElement::from_dec_str("5432").unwrap(),
    //         block_number: 111,
    //         keys: vec![
    //             TRANSFER_SELECTOR, // This is the selector, so it's not used to extract event data
    //         ],
    //         data: vec![
    //             FieldElement::from_dec_str("1234").unwrap(),   // from
    //             FieldElement::from_dec_str("5678").unwrap(),   // to
    //             FieldElement::from_dec_str("91011").unwrap(),  // token_id_low
    //             FieldElement::from_dec_str("121314").unwrap(), // token_id_high
    //         ],
    //     };

    //     let contract_type = ContractType::ERC721;
    //     let timestamp = 1234567890;

    //     // Call the `format_event` function
    //     let result = manager
    //         .format_event(&sample_event, contract_type, timestamp)
    //         .await;

    //     // Assertions
    //     assert!(result.is_ok());
    //     let token_event = result.unwrap();

    //     // Check if the extracted data matches the data from `event.data`
    //     assert_eq!(
    //         token_event.from_address_field_element,
    //         FieldElement::from_dec_str("1234").unwrap()
    //     );
    //     assert_eq!(
    //         token_event.to_address_field_element,
    //         FieldElement::from_dec_str("5678").unwrap()
    //     );
    //     assert_eq!(
    //         token_event.token_id.low,
    //         FieldElement::from_dec_str("91011").unwrap()
    //     );
    //     assert_eq!(
    //         token_event.token_id.high,
    //         FieldElement::from_dec_str("121314").unwrap()
    //     );
    // }

    // #[test]
    // fn test_keys_selector() {
    //     let storage = Arc::new(MockStorageManager::default());
    //     let manager = EventManager::new(storage);

    //     // Call the method
    //     let result = manager.keys_selector().unwrap();

    //     // Define expected result
    //     let expected = vec![vec![selector!("Transfer")]];

    //     // Assert the output
    //     assert_eq!(result, expected);
    // }

    // /// Tests the `get_event_info_from_felts` method with correct input format and length.
    // /// Ensures that the method correctly extracts and returns the event info.
    // #[test]
    // fn test_get_event_info_from_felts() {
    //     // Create sample data for the test
    //     let from_value = FieldElement::from_dec_str("1234").unwrap();
    //     let to_value = FieldElement::from_dec_str("5678").unwrap();
    //     let token_id_low = FieldElement::from_dec_str("91011").unwrap();
    //     let token_id_high = FieldElement::from_dec_str("121314").unwrap();

    //     let sample_data = vec![from_value, to_value, token_id_low, token_id_high];

    //     // Call the method
    //     let result = EventManager::<MockStorageManager>::get_event_info_from_felts(&sample_data);

    //     // Assert the output
    //     assert_eq!(result.is_some(), true);
    //     let (from, to, token_id) = result.unwrap();
    //     assert_eq!(from, from_value);
    //     assert_eq!(to, to_value);
    //     assert_eq!(token_id.low, token_id_low);
    //     assert_eq!(token_id.high, token_id_high);
    // }

    // /// Tests the `get_event_info_from_felts` method with insufficient FieldElements.
    // /// Ensures that the method returns None when not provided enough data.
    // #[test]
    // fn test_get_event_info_from_felts_insufficient_data() {
    //     // Create sample data for the test with insufficient FieldElements
    //     let sample_data = vec![
    //         FieldElement::from_dec_str("1234").unwrap(),
    //         FieldElement::from_dec_str("5678").unwrap(),
    //     ];

    //     // Call the method
    //     let result = EventManager::<MockStorageManager>::get_event_info_from_felts(&sample_data);

    //     // Assert the output
    //     assert_eq!(result.is_none(), true);
    // }
}
