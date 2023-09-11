use anyhow::{anyhow, Result};
use ark_starknet::utils::{FormattedTokenId, TokenId};
use starknet::core::types::{EmittedEvent, FieldElement};

#[derive(Debug)]
pub struct EventManager {
    pub timestamp: u64,
    pub from_address_field_element: FieldElement,
    pub from_address: String,
    pub to_address: String,
    pub contract_address: String,
    pub transaction_hash: String,
    pub token_id: TokenId,
    pub formated_token_id: FormattedTokenId,
    pub block_number: u64,
    pub contract_type: String,
}

impl EventManager {
    pub fn new() -> Self {
        EventManager {
            timestamp: 0,
            from_address: String::new(),
            to_address: String::new(),
            contract_address: String::new(),
            transaction_hash: String::new(),
            from_address_field_element: FieldElement::ZERO,
            token_id: TokenId {
                low: FieldElement::ZERO,
                high: FieldElement::ZERO,
            },
            formated_token_id: FormattedTokenId::default(), // Assuming you have a default implementation
            block_number: 0,
            contract_type: String::new(),
        }
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

        self.from_address_field_element = event.data[0];
        self.from_address = format!("{:#064x}", event.data[0]);
        self.to_address = format!("{:#064x}", event.data[1]);
        self.contract_address = format!("{:#064x}", event.from_address);
        self.transaction_hash = format!("{:#064x}", event.transaction_hash);

        self.token_id = TokenId {
            low: event.data[2],
            high: event.data[3],
        };

        self.formated_token_id = self.token_id.format();
        self.block_number = event.block_number;
        self.timestamp = timestamp;
        self.contract_type = contract_type.to_string();
        Ok(())
    }

    pub fn get_self(&self) -> &Self {
        self
    }
}
