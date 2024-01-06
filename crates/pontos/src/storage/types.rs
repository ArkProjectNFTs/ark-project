use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

#[derive(Debug, Clone)]
pub enum StorageError {
    DatabaseError(String),
    NotFound(String),
    InvalidStatus(String),
    DuplicateToken(String),
    InvalidMintData(String),
    AlreadyExists(String),
}

impl fmt::Display for StorageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Note the lifetime parameter <'_>
        match self {
            StorageError::DatabaseError(s) => write!(f, "Database error occurred: {s}"),
            StorageError::NotFound(s) => write!(f, "Item not found in storage: {s}"),
            StorageError::InvalidStatus(s) => write!(f, "Invalid status: {s}"),
            StorageError::DuplicateToken(s) => write!(f, "Token already exists in storage: {s}"),
            StorageError::InvalidMintData(s) => write!(f, "Provided mint data is invalid: {s}"),
            StorageError::AlreadyExists(s) => write!(f, "Item already exists in storage: {s}"),
        }
    }
}

impl std::error::Error for StorageError {}

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EventType {
    Mint,
    Burn,
    Transfer,
    Uninitialized,
}

impl fmt::Display for EventType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EventType::Mint => write!(f, "MINT"),
            EventType::Burn => write!(f, "BURN"),
            EventType::Transfer => write!(f, "TRANSFER"),
            EventType::Uninitialized => write!(f, "UNINITIALIZED"),
        }
    }
}

impl FromStr for EventType {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "MINT" => Ok(EventType::Mint),
            "BURN" => Ok(EventType::Burn),
            "TRANSFER" => Ok(EventType::Transfer),
            "UNINITIALIZED" => Ok(EventType::Uninitialized),
            _ => Err(()),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TokenEvent {
    pub timestamp: u64,
    pub from_address: String,
    pub to_address: String,
    pub contract_address: String,
    pub transaction_hash: String,
    pub token_id: String,
    pub token_id_hex: String,
    pub contract_type: String,
    pub event_type: EventType,
    pub event_id: String,
}

impl Default for TokenEvent {
    fn default() -> Self {
        TokenEvent {
            timestamp: 0,
            from_address: String::new(),
            to_address: String::new(),
            contract_address: String::new(),
            transaction_hash: String::new(),
            token_id: String::new(),
            token_id_hex: String::new(),
            contract_type: String::new(),
            event_type: EventType::Uninitialized,
            event_id: "0".to_string(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct TokenInfo {
    pub contract_address: String,
    pub token_id: String,
    pub token_id_hex: String,
    pub owner: String,
}

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct TokenMintInfo {
    pub address: String,
    pub timestamp: u64,
    pub transaction_hash: String,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
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

#[derive(Debug)]
pub enum IndexerStatus {
    Requested,
    Running,
    Stopped,
}

impl fmt::Display for IndexerStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            IndexerStatus::Requested => write!(f, "requested"),
            IndexerStatus::Running => write!(f, "running"),
            IndexerStatus::Stopped => write!(f, "stopped"),
        }
    }
}

pub struct Range {
    pub start: u64,
    pub end: u64,
}

pub struct BlockIndexing {
    pub range: Range,
    pub percentage: u64,
    pub status: IndexerStatus,
    pub identifier: String,
    pub indexer_version: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BlockInfo {
    pub indexer_version: String,
    pub indexer_identifier: String,
    pub status: BlockIndexingStatus,
    pub block_number: u64,
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
            ContractType::Other => "OTHER".to_string(),
            ContractType::ERC721 => "ERC721".to_string(),
            ContractType::ERC1155 => "ERC1155".to_string(),
        }
    }
}

impl FromStr for ContractType {
    type Err = (); // You can use a more descriptive error type if needed

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "ERC721" => Ok(ContractType::ERC721),
            "ERC1155" => Ok(ContractType::ERC1155),
            _ => Ok(ContractType::Other),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct ContractInfo {
    pub contract_address: String,
    pub contract_type: String,
    pub name: Option<String>,
    pub symbol: Option<String>,
}
