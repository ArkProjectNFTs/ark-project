use crate::utils::format_token_id;
use num_bigint::BigUint;
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

#[derive(Debug, Clone)]
pub struct FormattedTokenId {
    pub low: u128,
    pub high: u128,
    pub token_id: String,
    pub padded_token_id: String,
}

impl Default for FormattedTokenId {
    fn default() -> Self {
        FormattedTokenId {
            low: 0,
            high: 0,
            token_id: "".to_string(),
            padded_token_id: "".to_string(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct TokenId {
    pub low: FieldElement,
    pub high: FieldElement,
}

impl TokenId {
    // Implement the format_token_id as a method on the struct
    pub fn format(&self) -> FormattedTokenId {
        // let token_id_low_hex = format!("{:#064x}", token_id_low);
        // let token_id_high_hex = format!("{:#064x}", token_id_high);

        // let low = u128::from_str_radix(token_id_low.to_string().as_str(), 10).unwrap();
        let low = self.low.to_string().as_str().parse::<u128>().unwrap();

        // let high = u128::from_str_radix(token_id_high.to_string().as_str(), 10).unwrap();
        let high = self.high.to_string().as_str().parse::<u128>().unwrap();

        let low_bytes = low.to_be_bytes();
        let high_bytes = high.to_be_bytes();

        let mut bytes: Vec<u8> = Vec::new();
        bytes.extend(high_bytes);
        bytes.extend(low_bytes);

        let token_id_big_uint = BigUint::from_bytes_be(&bytes[..]);
        let token_id: String = token_id_big_uint.to_str_radix(10);
        let padded_token_id = format_token_id(token_id.clone());

        FormattedTokenId {
            low,
            high,
            token_id: token_id.clone(),
            padded_token_id,
        }
    }
}
