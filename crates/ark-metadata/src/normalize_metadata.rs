use anyhow::{anyhow, Ok, Result};
use log::warn;
use serde_json::Value;

use crate::metadata_manager::{MetadataAttribute, MetadataAttributeValue, NormalizedMetadata};

// fn normalize_metadata_attributes_with_eip721_standard(
//     metadata_uri: String,
//     raw_metadata: &Value,
// ) -> Result<NormalizedMetadata> {
//     match raw_metadata.get("properties") {
//         Some(raw_properties) => {
//             let mut attributes: Vec<MetadataAttribute> = Vec::new();
//             for (key, value) in raw_properties.as_object().unwrap() {
//                 let trait_type = key;
//                 let value = value.as_str().unwrap();
//                 let display_type = String::from("string");
//                 let metadata_attribute = MetadataAttribute {
//                     trait_type: String::from(trait_type),
//                     value: String::from(value)
//                 };
//                 attributes.push(metadata_attribute);
//             }

//             let common_properties = extract_common_metadata(raw_metadata);
//             Ok(NormalizedMetadata {
//                 description: common_properties.description,
//                 external_url: metadata_uri,
//                 image: common_properties.image,
//                 name: common_properties.name,
//                 attributes,
//             })
//         }
//         None => Err(anyhow!("Error with the metadata object")),
//     }
// }

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

pub fn normalize_metadata_attributes_with_opensea_standard(
    metadata_uri: String,
    raw_metadata: &Value,
) -> Result<NormalizedMetadata> {
    let attribute_results: Vec<MetadataAttribute> = match raw_metadata.get("attributes") {
        Some(raw_attributes) => {
            let mut attributes: Vec<MetadataAttribute> = Vec::new();
            let items = match raw_attributes.as_array() {
                Some(attributes) => attributes.clone(),
                None => Vec::new(),
            };

            for attribute in items {
                let trait_type =  attribute
                .get("trait_type")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

                match attribute.get("value") {
                    Some(attribute_value) => match attribute_value {
                        Value::String(value) => {
                            attributes.push(MetadataAttribute {
                                trait_type: String::from(trait_type),
                                value: MetadataAttributeValue::Str(value.to_string()),
                            });
                        }
                        Value::Number(value) => {
                            if value.is_f64() {
                                attributes.push(MetadataAttribute {
                                    trait_type: String::from(trait_type),
                                    value: MetadataAttributeValue::Float(value.as_f64().unwrap()),
                                });
                            } else {
                                attributes.push(MetadataAttribute {
                                    trait_type: String::from(trait_type),
                                    value: MetadataAttributeValue::Int(value.as_i64().unwrap()),
                                });
                            }
                        }
                        _ => {
                            attributes.push(MetadataAttribute {
                                trait_type: String::from(trait_type),
                                value: MetadataAttributeValue::Value(
                                    attribute_value.clone(),
                                ),
                            });
                        }
                    },
                    None => {
                        warn!("Missing value for attribute: {:?}", attribute);
                    }
                };
            }
            attributes
        }
        None => Vec::new(),
    };

    let common_properties = extract_common_metadata(raw_metadata);
    let external_url = match raw_metadata.get("external_url") {
        Some(value) => value.as_str().unwrap().to_string(),
        None => metadata_uri,
    };

    Ok(NormalizedMetadata {
        description: common_properties.description,
        external_url,
        image: common_properties.image,
        name: common_properties.name,
        attributes: attribute_results,
    })
}

pub fn normalize_metadata(
    initial_metadata_uri: String,
    raw_metadata: Value,
) -> Result<NormalizedMetadata> {
  
    match raw_metadata.get("attributes") {
        Some(_attributes) => {
            let normalized_metadata = normalize_metadata_attributes_with_opensea_standard(
                initial_metadata_uri,
                &raw_metadata,
            )?;
            return Ok(normalized_metadata);
        }
        None => {
            Err(anyhow!("Error with the metadata object"))
        },
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        metadata_manager::MetadataAttributeValue,
        normalize_metadata::{
            normalize_metadata, normalize_metadata_attributes_with_opensea_standard,
        },
    };
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

        println!("\n\n==> normalized_metadata: {:?}", normalized_metadata);

        assert!(normalized_metadata.external_url == metadata_uri);
        assert!(normalized_metadata.description == description);
        assert!(normalized_metadata.image == image);
        assert!(normalized_metadata.name == name);

        let first_attribute = normalized_metadata.attributes.first().unwrap();

        assert!(first_attribute.trait_type == "Subdomain");

        // println!("\n\n==> Value: {}", first_attribute.value);
        println!("==> Value: {:?}", first_attribute.value);

    }

    #[test]
    fn should_normalize_metadata_attributes_with_opensea_standard() {
        let description = "Friendly OpenSea Creature that enjoys long swims in the ocean.";
        let image = "https://storage.googleapis.com/opensea-prod.appspot.com/puffs/3.png";
        let name = "Dave Starbelly";
        let external_url = "https://openseacreatures.io/3";

        let starknet_id_raw_metadata = json!({
          "description": description,
          "external_url": external_url,
          "image": image,
          "name": name,
          "attributes": [
              {
                "trait_type": "Base",
                "value": "Starfish"
              },
              {
                "trait_type": "Eyes",
                "value": "Big"
              },
              {
                "trait_type": "Mouth",
                "value": "Surprised"
              },
              {
                "trait_type": "Level",
                "value": 5
              },
              {
                "trait_type": "Stamina",
                "value": 1.4
              },
              {
                "trait_type": "Personality",
                "value": "Sad"
              },
              {
                "display_type": "boost_number",
                "trait_type": "Aqua Power",
                "value": 40
              },
              {
                "display_type": "boost_percentage",
                "trait_type": "Stamina Increase",
                "value": 10
              },
              {
                "display_type": "number",
                "trait_type": "Generation",
                "value": 2
              },
              {
                "display_type": "number",
                "trait_type": "Generation",
                "value": 2
              },
            ]
        });
        let metadata_uri = String::from("https://api.starknet.id/uri?id=1");

        let result = normalize_metadata_attributes_with_opensea_standard(
            metadata_uri.clone(),
            &starknet_id_raw_metadata,
        );

        assert!(result.is_ok());

        let normalized_metadata = result.unwrap();

        assert!(normalized_metadata.external_url == external_url);
        assert!(normalized_metadata.description == description);
        assert!(normalized_metadata.image == image);
        assert!(normalized_metadata.name == name);

        let first_attribute = normalized_metadata.attributes.first().clone().unwrap();
        assert!(first_attribute.trait_type == "Base");
        assert!(first_attribute.value == MetadataAttributeValue::Str(String::from("Starfish")));

        let last_attribute = normalized_metadata.attributes.last().clone().unwrap();

        assert!(last_attribute.trait_type == "Generation");
        assert!(last_attribute.value == MetadataAttributeValue::Int(2));
    }
}
