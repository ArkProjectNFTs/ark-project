use aws_sdk_dynamodb::types::AttributeValue;
use log::{error, info, warn};
use reqwest::Client as ReqwestClient;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::error::Error;
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct MetadataAttribute {
    trait_type: String,
    value: String,
    display_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NormalizedMetadata {
    pub description: String,
    pub external_url: String,
    pub image: String,
    pub name: String,
    attributes: Vec<MetadataAttribute>,
}

impl From<NormalizedMetadata> for HashMap<String, AttributeValue> {
    fn from(metadata: NormalizedMetadata) -> Self {
        let mut attributes: HashMap<String, AttributeValue> = HashMap::new();

        attributes.insert(
            "description".to_string(),
            AttributeValue::S(metadata.description),
        );
        attributes.insert(
            "external_url".to_string(),
            AttributeValue::S(metadata.external_url),
        );
        attributes.insert("image".to_string(), AttributeValue::S(metadata.image));
        attributes.insert("name".to_string(), AttributeValue::S(metadata.name));

        let attributes_list: Vec<AttributeValue> = metadata
            .attributes
            .into_iter()
            .map(|attribute| {
                let mut attribute_map: HashMap<String, AttributeValue> = HashMap::new();
                attribute_map.insert(
                    "trait_type".to_string(),
                    AttributeValue::S(attribute.trait_type),
                );
                attribute_map.insert("value".to_string(), AttributeValue::S(attribute.value));
                attribute_map.insert(
                    "display_type".to_string(),
                    AttributeValue::S(attribute.display_type),
                );
                AttributeValue::M(attribute_map)
            })
            .collect();

        attributes.insert("attributes".to_string(), AttributeValue::L(attributes_list));

        attributes
    }
}


