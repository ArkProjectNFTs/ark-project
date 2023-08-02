use aws_sdk_dynamodb::types::AttributeValue;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::error::Error;

#[derive(Debug, Serialize, Deserialize)]
struct MetadataAttribute {
    trait_type: String,
    value: String,
    display_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
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

pub async fn get_metadata(
    client: &reqwest::Client,
    metadata_uri: &str,
    initial_metadata_uri: &str,
) -> Result<(Value, NormalizedMetadata), Box<dyn Error>> {
    println!("Fetching metadata: {}", metadata_uri);

    let response = client.get(metadata_uri).send().await?;
    let raw_metadata: Value = response.json().await?;

    println!("Metadata: {:?}", raw_metadata);

    let empty_vec = Vec::new();

    let attributes = raw_metadata
        .get("attributes")
        .and_then(|attr| attr.as_array())
        .unwrap_or(&empty_vec);

    let normalized_attributes: Vec<MetadataAttribute> = attributes
        .iter()
        .map(|attribute| MetadataAttribute {
            trait_type: attribute
                .get("trait_type")
                .and_then(|trait_type| trait_type.as_str())
                .unwrap_or("")
                .to_string(),
            value: attribute
                .get("value")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string(),
            display_type: attribute
                .get("display_type")
                .and_then(|display_type| display_type.as_str())
                .unwrap_or("")
                .to_string(),
        })
        .collect();

    let normalized_metadata = NormalizedMetadata {
        description: raw_metadata
            .get("description")
            .and_then(|desc| desc.as_str())
            .unwrap_or("")
            .to_string(),
        external_url: initial_metadata_uri.to_string(),
        image: raw_metadata
            .get("image")
            .and_then(|img| img.as_str())
            .unwrap_or("")
            .to_string(),
        name: raw_metadata
            .get("name")
            .and_then(|name| name.as_str())
            .unwrap_or("")
            .to_string(),
        attributes: normalized_attributes,
    };

    Ok((raw_metadata, normalized_metadata))
}
