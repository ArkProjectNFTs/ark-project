use crate::ContractType;
use anyhow::{anyhow, Result};
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::{EventType, TokenEvent, TokenId};
use log::info;
use starknet::core::types::{EmittedEvent, FieldElement};
use starknet::macros::selector;

const TRANSFER_SELECTOR: FieldElement = selector!("Transfer");

#[derive(Debug)]
pub struct EventManager<'a, T: StorageManager> {
    storage: &'a T,
    token_event: TokenEvent,
}

impl<'a, T: StorageManager> EventManager<'a, T> {
    /// Initializes a new instance.
    pub fn new(storage: &'a T) -> Self {
        EventManager {
            storage,
            token_event: TokenEvent::default(),
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
