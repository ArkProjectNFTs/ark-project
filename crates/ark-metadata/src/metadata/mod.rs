pub mod normalization;

use serde_derive::{Serialize, Deserialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum MetadataAttributeValue {
    Str(String),
    Int(i64),
    Float(f64),
    Value(Value),
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct MetadataAttribute {
    pub trait_type: String,
    pub value: MetadataAttributeValue,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NormalizedMetadata {
    pub description: String,
    pub external_url: String,
    pub image: String,
    pub name: String,
    pub attributes: Vec<MetadataAttribute>,
}