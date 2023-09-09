use super::shared_state::EventData;
use anyhow::{anyhow, Result};
use ark_starknet::client2::StarknetClient;
use serde_json::Value;
use starknet::core::types::EmittedEvent;
use std::sync::{Arc, Mutex};

pub struct EventManager {
    client: StarknetClient,
    shared_state: Arc<Mutex<EventData>>,
}

impl EventManager {
    pub fn new(client: StarknetClient, shared_state: Arc<Mutex<EventData>>) -> Self {
        EventManager {
            client,
            shared_state,
        }
    }

    pub fn format_event(&self, event: &EmittedEvent) -> Result<()> {
        if event.data.len() < 4 {
            return Err(anyhow!("Invalid event data"));
        }

        let from_address_field_element = event["data"][0]
            .as_u64()
            .ok_or(anyhow!("Failed to parse 'from' address"))?;
        let to_address_field_element = event["data"][1]
            .as_u64()
            .ok_or(anyhow!("Failed to parse 'to' address"))?;
        let token_id_low = event["data"][2]
            .as_u64()
            .ok_or(anyhow!("Failed to parse 'token_id_low'"))?;
        let token_id_high = event["data"][3]
            .as_u64()
            .ok_or(anyhow!("Failed to parse 'token_id_high'"))?;

        let from_address = format!("{:#064x}", from_address_field_element);
        let to_address = format!("{:#064x}", to_address_field_element);
        let contract_address = format!(
            "{:#064x}",
            event["from_address"]
                .as_u64()
                .ok_or(anyhow!("Failed to parse contract address"))?
        );
        let transaction_hash = format!(
            "{:#064x}",
            event["transaction_hash"]
                .as_u64()
                .ok_or(anyhow!("Failed to parse transaction hash"))?
        );
        let block_number = event["block_number"]
            .as_u64()
            .ok_or(anyhow!("Failed to parse block number"))?;

        // Update shared state
        let mut state = self.shared_state.lock().unwrap();
        *state = EventData {
            from_address,
            to_address,
            contract_address,
            transaction_hash,
            token_id_low,
            token_id_high,
            block_number,
        };

        Ok(())
    }

    // ... Other methods that might require both the StarknetClient and the shared state can be added here.
}
