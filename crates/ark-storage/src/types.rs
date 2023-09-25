use crate::utils::format_token_id;
use num_bigint::BigUint;
use serde::{Deserialize, Serialize};
use starknet::core::types::FieldElement;
use std::fmt;
use std::str::FromStr;

#[derive(Debug)]
pub enum StorageError {
    DatabaseError,
    NotFound,
    InvalidStatus,
    DuplicateToken,
    InvalidMintData,
    AlreadyExists,
}

impl fmt::Display for StorageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Note the lifetime parameter <'_>
        match self {
            StorageError::DatabaseError => write!(f, "Database error occurred"),
            StorageError::NotFound => write!(f, "Item not found in storage"),
            StorageError::InvalidStatus => write!(f, "Invalid status"),
            StorageError::DuplicateToken => write!(f, "Token already exists in storage"),
            StorageError::InvalidMintData => write!(f, "Provided mint data is invalid"),
            StorageError::AlreadyExists => write!(f, "Item already exists in storage"),
        }
    }
}

impl std::error::Error for StorageError {}

#[derive(Debug, PartialEq, Clone)]
pub enum EventType {
    Mint,
    Burn,
    Transfer,
    Uninitialized,
}

impl fmt::Display for EventType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            EventType::Mint => write!(f, "mint"),
            EventType::Burn => write!(f, "burn"),
            EventType::Transfer => write!(f, "transfer"),
            EventType::Uninitialized => write!(f, "uninitialized"),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
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
    pub event_type: EventType,
    pub event_id: FieldElement,
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
            block_number: 0,
            contract_type: String::new(),
            event_type: EventType::Uninitialized,
            event_id: FieldElement::ZERO,
        }
    }
}

// Token struct based on the informations we get from an event
#[derive(Debug, Clone, PartialEq)]
pub struct TokenFromEvent {
    pub address: String,
    pub token_id: TokenId,
    pub formated_token_id: FormattedTokenId,
    pub owner: String,
    pub mint_address: Option<FieldElement>,
    pub mint_timestamp: Option<u64>,
    pub mint_transaction_hash: Option<String>,
    pub mint_block_number: Option<u64>,
}

impl Default for TokenFromEvent {
    fn default() -> Self {
        TokenFromEvent {
            address: String::new(),
            token_id: TokenId {
                low: FieldElement::ZERO,
                high: FieldElement::ZERO,
            },
            formated_token_id: FormattedTokenId::default(),
            owner: String::new(),
            mint_address: None,
            mint_timestamp: None,
            mint_transaction_hash: None,
            mint_block_number: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
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

#[derive(Debug, Clone, PartialEq)]
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

#[derive(Debug, PartialEq)]
pub enum BlockIndexingStatus {
    None,
    Processing,
    Terminated,
}

impl ToString for BlockIndexingStatus {
    fn to_string(&self) -> String {
        match self {
            BlockIndexingStatus::None => "None".to_string(),
            BlockIndexingStatus::Processing => "Processing".to_string(),
            BlockIndexingStatus::Terminated => "Terminated".to_string(),
        }
    }
}

impl FromStr for BlockIndexingStatus {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "None" => Ok(BlockIndexingStatus::None),
            "Processing" => Ok(BlockIndexingStatus::Processing),
            "Terminated" => Ok(BlockIndexingStatus::Terminated),
            _ => Err(()),
        }
    }
}

pub enum IndexerStatus {
    Running,
    Stopped,
}

pub struct Range {
    pub start: u64,
    pub end: u64,
}

pub struct BlockIndexing {
    pub range: Range,
    pub percentage: u64,
    pub status: IndexerStatus,
    pub indentifier: String,
    pub indexer_version: u64,
}

#[derive(Debug)]
pub struct BlockInfo {
    pub indexer_version: u64,
    pub indexer_identifier: String,
    pub status: BlockIndexingStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ContractType {
    Other,
    ERC721,
    ERC1155,
}

impl ToString for ContractType {
    fn to_string(&self) -> String {
        match self {
            ContractType::Other => "other".to_string(),
            ContractType::ERC721 => "erc721".to_string(),
            ContractType::ERC1155 => "erc1155".to_string(),
        }
    }
}

impl FromStr for ContractType {
    type Err = (); // You can use a more descriptive error type if needed

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "erc721" => Ok(ContractType::ERC721),
            "erc1155" => Ok(ContractType::ERC1155),
            _ => Ok(ContractType::Other),
        }
    }
}
