use ark_starknet::utils::{FormattedTokenId, TokenId};
use starknet::core::types::FieldElement;

#[derive(Debug, PartialEq, Clone)]
pub enum EventType {
    Mint,
    Burn,
    Transfer,
    Uninitialized,
}

#[derive(Debug, Clone)]
pub struct TokenEvent {
    pub timestamp: u64,
    pub from_address_field_element: FieldElement,
    pub to_address_field_element: FieldElement,
    pub from_address: String,
    pub to_address: String,
    pub contract_address: String,
    pub transaction_hash: String,
    pub token_id: TokenId,
    pub formated_token_id: FormattedTokenId,
    pub block_number: u64,
    pub contract_type: String,
    pub padded_token_id: String,
    pub event_type: EventType,
}

impl Default for TokenEvent {
    fn default() -> Self {
        TokenEvent {
            timestamp: 0,
            from_address_field_element: FieldElement::ZERO,
            to_address_field_element: FieldElement::ZERO,
            from_address: String::new(),
            to_address: String::new(),
            contract_address: String::new(),
            transaction_hash: String::new(),
            token_id: TokenId {
                low: FieldElement::ZERO,
                high: FieldElement::ZERO,
            },
            formated_token_id: FormattedTokenId::default(),
            padded_token_id: FormattedTokenId::default().padded_token_id,
            block_number: 0,
            contract_type: String::new(),
            event_type: EventType::Uninitialized,
        }
    }
}

// Token struct based on the informations we get from an event
#[derive(Debug, Clone, Default)]
pub struct TokenFromEvent {
    pub address: String,
    pub padded_token_id: String,
    pub from_address: String,
    pub to_address: String,
    pub timestamp: u64,
    pub owner: String,
    pub mint_transaction_hash: Option<String>,
    pub block_number_minted: Option<u64>, 
}
