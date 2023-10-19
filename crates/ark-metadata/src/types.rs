use serde_derive::{Deserialize, Serialize};
use serde_json::Number;
use std::fmt;

#[derive(Debug, PartialEq)]
pub enum MetadataType {
    Http(String),
    Ipfs(String),
    OnChain(String),
}

#[derive(Debug)]
pub enum StorageError {
    DatabaseError,
    NotFound,
    DuplicateToken,
    InvalidMintData,
}

#[derive(Debug, Deserialize, Serialize)]
pub enum DisplayType {
    Number,
    BoostPercentage,
    BoostNumber,
    Date,
}

impl fmt::Display for DisplayType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            DisplayType::Number => write!(f, "Number"),
            DisplayType::BoostPercentage => write!(f, "Boost Percentage"),
            DisplayType::BoostNumber => write!(f, "Boost Number"),
            DisplayType::Date => write!(f, "Date"),
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(untagged)]
pub enum MetadataAttributeValue {
    String(String),
    Number(Number),
    Bool(bool),
    StringVec(Vec<String>),
    NumberVec(Vec<Number>),
    BoolVec(Vec<bool>),
}

#[derive(Debug, Deserialize, Serialize)]
pub struct MetadataAttribute {
    pub display_type: Option<DisplayType>,
    pub trait_type: Option<String>,
    pub value: MetadataAttributeValue,
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct TokenMetadata {
    pub image: Option<String>,
    pub image_data: Option<String>,
    pub external_url: Option<String>,
    pub description: Option<String>,
    pub name: Option<String>,
    pub attributes: Option<Vec<MetadataAttribute>>,
    pub background_color: Option<String>,
    pub animation_url: Option<String>,
    pub youtube_url: Option<String>,
}
