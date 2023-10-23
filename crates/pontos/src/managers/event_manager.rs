use crate::storage::types::{EventType, TokenEvent};
use crate::storage::Storage;
use crate::ContractType;
use anyhow::{anyhow, Result};
use ark_starknet::{format::to_hex_str, CairoU256};
use starknet::core::types::{EmittedEvent, FieldElement};
use starknet::core::utils::starknet_keccak;
use starknet::macros::selector;
use std::sync::Arc;
use tracing::{debug, trace};

const TRANSFER_SELECTOR: FieldElement = selector!("Transfer");

#[derive(Debug)]
pub struct EventManager<S: Storage> {
    storage: Arc<S>,
}

impl<S: Storage> EventManager<S> {
    /// Initializes a new instance.
    pub fn new(storage: Arc<S>) -> Self {
        EventManager {
            storage: Arc::clone(&storage),
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
        block_timestamp: u64,
    ) -> Result<(CairoU256, TokenEvent)> {
        let mut token_event = TokenEvent::default();

        debug!(
            "Processing event: event={:?}, contract_type={:?}, timestamp={}",
            event, contract_type, block_timestamp
        );

        // As cairo didn't have keys before, we first check if the data
        // contains the info. If not, we check into the keys, skipping the first
        // element which is the selector.
        let event_info: (FieldElement, FieldElement, CairoU256) =
            if let Some(d_info) = Self::get_event_info_from_felts(&event.data) {
                d_info
            } else if let Some(k_info) = Self::get_event_info_from_felts(&event.keys[1..]) {
                k_info
            } else {
                return Err(anyhow!("Can't find event data into this event"));
            };

        let (from, to, token_id) = event_info;

        let event_id = Self::get_event_id(&token_id, &from, &to, block_timestamp, event);

        token_event.from_address = to_hex_str(&from);
        token_event.to_address = to_hex_str(&to);
        token_event.contract_address = to_hex_str(&event.from_address);
        token_event.transaction_hash = to_hex_str(&event.transaction_hash);
        token_event.token_id_hex = token_id.to_hex();
        token_event.token_id = token_id.to_decimal(false);
        token_event.timestamp = block_timestamp;
        token_event.contract_type = contract_type.to_string();
        token_event.event_type = Self::get_event_type(from, to);
        token_event.event_id = to_hex_str(&event_id);

        trace!("Registering event: {:?}", token_event);

        self.storage
            .register_event(&token_event, block_timestamp)
            .await?;

        Ok((token_id, token_event.clone()))
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
    /// We enforce everything to be a field element to have fix
    /// bytes lengths, and ease the re-computation of this value
    /// from else where.
    pub fn get_event_id(
        token_id: &CairoU256,
        from: &FieldElement,
        to: &FieldElement,
        timestamp: u64,
        event: &EmittedEvent,
    ) -> FieldElement {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&FieldElement::from(token_id.low).to_bytes_be());
        bytes.extend_from_slice(&FieldElement::from(token_id.high).to_bytes_be());
        bytes.extend_from_slice(&from.to_bytes_be());
        bytes.extend_from_slice(&to.to_bytes_be());
        bytes.extend_from_slice(&event.from_address.to_bytes_be());
        bytes.extend_from_slice(&event.transaction_hash.to_bytes_be());
        bytes.extend_from_slice(&FieldElement::from(timestamp).to_bytes_be());
        starknet_keccak(&bytes)
    }

    /// Returns the event info from vector of felts.
    /// Event info are (from, to, token_id).
    ///
    /// This methods considers that the info of the
    /// event is starting at index 0 of the input vector.
    fn get_event_info_from_felts(
        felts: &[FieldElement],
    ) -> Option<(FieldElement, FieldElement, CairoU256)> {
        if felts.len() < 4 {
            return None;
        }
        let from = felts[0];
        let to = felts[1];

        // Safe to unwrap, as emitted events follow cairo sequencer specification.
        let token_id = CairoU256 {
            low: felts[2].try_into().unwrap(),
            high: felts[3].try_into().unwrap(),
        };

        Some((from, to, token_id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::MockStorage;

    /// Sets up sample data and event for testing purposes.
    fn setup_sample_event() -> EmittedEvent {
        EmittedEvent {
            from_address: FieldElement::from_hex_be("0x0").unwrap(),
            block_hash: FieldElement::from_dec_str("786").unwrap(),
            transaction_hash: FieldElement::from_dec_str("5432").unwrap(),
            block_number: 111,
            keys: vec![
                TRANSFER_SELECTOR,
                FieldElement::from_hex_be("0x1234").unwrap(),
                FieldElement::from_hex_be("0x5678").unwrap(),
            ],
            data: vec![
                FieldElement::from_hex_be("0x1234").unwrap(),
                FieldElement::from_hex_be("0x5678").unwrap(),
                FieldElement::from_dec_str("91011").unwrap(),
                FieldElement::from_dec_str("121314").unwrap(),
            ],
        }
    }

    #[tokio::test]
    async fn test_format_event_successfully() {
        let mut storage = MockStorage::default();

        storage
            .expect_register_event()
            .returning(|_, _| Box::pin(futures::future::ready(Ok(()))));

        let manager = EventManager::new(Arc::new(storage));

        let sample_event = setup_sample_event();
        let contract_type = ContractType::ERC721;
        let timestamp = 1234567890;

        let result = manager
            .format_and_register_event(&sample_event, contract_type, timestamp)
            .await;

        assert!(result.is_ok());

        let (_, token_event) = result.unwrap();

        assert_eq!(
            token_event.from_address,
            to_hex_str(&FieldElement::from_hex_be("0x1234").unwrap())
        );
    }

    #[tokio::test]
    async fn test_format_event_data_extraction_from_data() {
        // Initialize a MockStorage and the EventManager
        let mut storage = MockStorage::default();

        storage
            .expect_register_event()
            .returning(|_, _| Box::pin(futures::future::ready(Ok(()))));

        let manager = EventManager::new(Arc::new(storage));

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
                FieldElement::from_hex_be("0x1234").unwrap(),  // from
                FieldElement::from_hex_be("0x5678").unwrap(),  // to
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
        let (token_id, token_event) = result.unwrap();

        // Check if the extracted data matches the data from `event.data`
        assert_eq!(
            token_event.from_address,
            to_hex_str(&FieldElement::from_hex_be("0x1234").unwrap())
        );
        assert_eq!(
            token_event.to_address,
            to_hex_str(&FieldElement::from_hex_be("0x5678").unwrap())
        );
        assert_eq!(token_id.low, 91011_u128);
        assert_eq!(token_id.high, 121314_u128);
    }

    #[test]
    fn test_keys_selector() {
        let storage = Arc::new(MockStorage::default());
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
        let token_id_low = 91011_u128;
        let token_id_high = 121314_u128;

        let sample_data = vec![
            from_value,
            to_value,
            token_id_low.into(),
            token_id_high.into(),
        ];

        // Call the method
        let result = EventManager::<MockStorage>::get_event_info_from_felts(&sample_data);

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
        let result = EventManager::<MockStorage>::get_event_info_from_felts(&sample_data);

        // Assert the output
        assert_eq!(result.is_none(), true);
    }
}
