use ark_starknet::CairoU256;
#[cfg(any(test, feature = "mock"))]
use mockall::automock;
use serde_derive::{Deserialize, Serialize};
use serde_json::Number;
use starknet::core::types::FieldElement;

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

#[derive(Debug, Deserialize, Serialize)]
#[serde(untagged)]
pub enum AttributeValue {
    String(String),
    Number(Number),
    Bool(bool),
    StringVec(Vec<String>),
    NumberVec(Vec<Number>),
    BoolVec(Vec<bool>),
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Attribute {
    pub display_type: Option<DisplayType>,
    pub trait_type: Option<String>,
    pub value: AttributeValue,
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct TokenMetadata {
    pub image: Option<String>,
    pub image_data: Option<String>,
    pub external_url: Option<String>,
    pub description: Option<String>,
    pub name: Option<String>,
    pub attributes: Option<Vec<Attribute>>,
    pub background_color: Option<String>,
    pub animation_url: Option<String>,
    pub youtube_url: Option<String>,
}

#[cfg_attr(any(test, feature = "mock"), automock)]
pub trait Storage {
    fn register_token_metadata(
        &self,
        contract_address: &FieldElement,
        token_id: CairoU256,
        token_metadata: TokenMetadata,
    ) -> Result<(), StorageError>;

    fn has_token_metadata(
        &self,
        contract_address: FieldElement,
        token_id: CairoU256,
    ) -> Result<bool, StorageError>;

    fn find_token_ids_without_metadata_in_collection(
        &self,
        contract_address: FieldElement,
    ) -> Result<Vec<CairoU256>, StorageError>;
}
