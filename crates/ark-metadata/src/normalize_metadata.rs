use anyhow::{anyhow, Ok, Result};
use serde_json::Value;

use crate::metadata_manager::{MetadataAttribute, NormalizedMetadata};

fn normalize_metadata_attributes_with_eip721_standard(
    raw_metadata: &Value,
    metadata_uri: String,
) -> Result<NormalizedMetadata> {
    match raw_metadata.get("properties") {
        Some(raw_properties) => {
            let mut attributes: Vec<MetadataAttribute> = Vec::new();
            for (key, value) in raw_properties.as_object().unwrap() {
                let trait_type = key;
                let value = value.as_str().unwrap();
                let display_type = String::from("string");
                let metadata_attribute = MetadataAttribute {
                    trait_type: String::from(trait_type),
                    value: String::from(value),
                    display_type: String::from(display_type),
                };
                attributes.push(metadata_attribute);
            }

            let common_properties = extract_common_metadata(raw_metadata);
            Ok(NormalizedMetadata {
                description: common_properties.description,
                external_url: metadata_uri,
                image: common_properties.image,
                name: common_properties.name,
                attributes,
            })
        }
        None => Err(anyhow!("Error with the metadata object")),
    }
}

struct CommonMetadataProperties {
    description: String,
    image: String,
    name: String,
}

fn extract_common_metadata(metadata: &Value) -> CommonMetadataProperties {
    let description = match metadata.get("description") {
        Some(description) => description.as_str().unwrap().to_string(),
        None => String::from(""),
    };

    let image = match metadata.get("image") {
        Some(value) => value.as_str().unwrap().to_string(),
        None => String::from(""),
    };

    let name = match metadata.get("name") {
        Some(value) => value.as_str().unwrap().to_string(),
        None => String::from(""),
    };

    return CommonMetadataProperties {
        description,
        image,
        name,
    };
}

fn normalize_metadata_attributes_with_opensea_standard(
    raw_metadata: &Value,
    metadata_uri: String,
) -> Result<NormalizedMetadata> {
    match raw_metadata.get("attributes") {
        Some(raw_attributes) => {
            let mut attributes: Vec<MetadataAttribute> = Vec::new();
            for attribute in raw_attributes.as_array().unwrap() {
                let trait_type = attribute.get("trait_type").unwrap().as_str().unwrap();
                let value = attribute.get("value").unwrap().as_str().unwrap();
                let display_type = String::from("string");
                let metadata_attribute = MetadataAttribute {
                    trait_type: String::from(trait_type),
                    value: String::from(value),
                    display_type: String::from(display_type),
                };
                attributes.push(metadata_attribute);
            }

            let common_properties = extract_common_metadata(raw_metadata);
            Ok(NormalizedMetadata {
                description: common_properties.description,
                external_url: metadata_uri,
                image: common_properties.image,
                name: common_properties.name,
                attributes,
            })
        }
        None => Err(anyhow!("Error with the metadata object")),
    }
}

pub fn normalize_metadata(
    initial_metadata_uri: String,
    raw_metadata: Value,
) -> Result<NormalizedMetadata> {
    match raw_metadata.get("attributes") {
        Some(attributes) => {
            let normalized_metadata = normalize_metadata_attributes_with_opensea_standard(
                attributes,
                initial_metadata_uri,
            )?;
            return Ok(normalized_metadata);
        }
        None => match raw_metadata.get("properties") {
            Some(properties) => {
                let normalized_metadata = normalize_metadata_attributes_with_eip721_standard(
                    properties,
                    initial_metadata_uri,
                )?;
                return Ok(normalized_metadata);
            }
            None => {
                return Err(anyhow!("Error with the metadata object"));
            }
        },
    }
}

#[cfg(test)]
mod tests {
    use crate::normalize_metadata::normalize_metadata;
    use serde_json::json;

    #[test]
    fn should_normalize_metadata() {
        let description = "This token represents an identity on StarkNet.";
        let image = "https://starknet.id/api/identicons/1";
        let name = "th0rgal.stark";
        let starknet_id_raw_metadata = json!({"name":name,"description": description,"image":image,"expiry":1701257226,"attributes":[{"trait_type":"Subdomain","value":["yes"]},{"trait_type":"Domain expiry","value":["Nov 29, 2023"]},{"trait_type":"Domain expiry timestamp","value":["1701257226"]}]});
        let metadata_uri = String::from("https://api.starknet.id/uri?id=1");
        let result = normalize_metadata(metadata_uri.clone(), starknet_id_raw_metadata);

        assert!(result.is_ok());

        let normalized_metadata = result.unwrap();
        assert!(normalized_metadata.external_url == metadata_uri);
        assert!(normalized_metadata.description == description);
        assert!(normalized_metadata.image == image);
        assert!(normalized_metadata.name == name);

        let first_attribute = normalized_metadata.attributes.first().unwrap();

        assert!(first_attribute.trait_type == "Subdomain");

        // println!("\n\n==> Value: {}", first_attribute.value);
        // assert!(first_attribute.value == "[\"yes\"]");
    }
}
