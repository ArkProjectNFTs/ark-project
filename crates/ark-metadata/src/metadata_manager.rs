use crate::cairo_strings::parse_cairo_long_string;
use anyhow::{anyhow, Result};
use ark_starknet::client::StarknetClient;
use ark_storage::storage_manager::StorageManager;
use log::error;
use log::info;
use log::warn;
use reqwest::Client as ReqwestClient;
use serde_derive::{Deserialize, Serialize};
use serde_json::Value;
use starknet::core::types::BlockId;
use starknet::core::types::BlockTag;
use starknet::core::types::FieldElement;
use starknet::macros::selector;
use std::time::Duration;

pub struct MetadataManager<'a, T: StorageManager, C: StarknetClient> {
    storage: &'a T,
    starknet_client: &'a C,
    request_client: ReqwestClient,
}

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

// trait NormalizedMetadata {
//     fn from(metadata: NormalizedMetadata) -> Self;
// }

// pub struct DefaultNormalizedMetadata;

// impl NormalizedMetadata for DefaultNormalizedMetadata {
//     fn from(metadata: NormalizedMetadata) -> Self {
//         let _ = metadata;
//     }
// }

impl<'a, T: StorageManager, C: StarknetClient> MetadataManager<'a, T, C> {
    pub fn new(storage: &'a T, starknet_client: &'a C) -> Self {
        MetadataManager {
            storage,
            starknet_client,
            request_client: ReqwestClient::new(),
        }
    }

    pub async fn get_token_uri(
        &mut self,
        token_id_low: FieldElement,
        token_id_high: FieldElement,
        contract_address: FieldElement,
    ) -> Result<String> {
        info!("get_token_id: [{:?}, {:?}]", token_id_low, token_id_high);
        match self
            .get_contract_property_string(
                contract_address,
                selector!("tokenURI"),
                vec![token_id_low.clone(), token_id_high.clone()],
                BlockId::Tag(BlockTag::Latest),
            )
            .await
        {
            Ok(token_uri_cairo0) => {
                if token_uri_cairo0 != "undefined" && !token_uri_cairo0.is_empty() {
                    return Err(anyhow!("Token URI not found"));
                }

                match self
                    .get_contract_property_string(
                        contract_address,
                        selector!("token_uri"),
                        vec![token_id_low.clone(), token_id_high.clone()],
                        BlockId::Tag(BlockTag::Latest),
                    )
                    .await
                {
                    Ok(token_uri_cairo1) => {
                        if token_uri_cairo1 != "undefined" && !token_uri_cairo1.is_empty() {
                            return Ok(token_uri_cairo1);
                        }
                        return Err(anyhow!("Token URI not found"));
                    }
                    Err(_) => Err(anyhow!("Token URI not found")),
                }
            }
            Err(_) => Err(anyhow!("Token URI not found")),
        }
    }

    pub async fn refresh_metadata(
        &mut self,
        contract_address: FieldElement,
        token_id_low: FieldElement,
        token_id_high: FieldElement,
        block_number: BlockId,
    ) -> Result<()> {
        let token_uri = self
            .get_token_uri(token_id_low, token_id_high, contract_address)
            .await?;

        // TODO: check if token_uri is already in db

        // TODO: save token uri in db

        let (raw_metadata, normalized_metadata) =
            self.fetch_metadata(&token_uri, &token_uri).await?;

        // TODO: save metadata in db

        Ok(())
    }

    pub async fn fetch_metadata(
        &mut self,
        metadata_uri: &str,
        initial_metadata_uri: &str,
    ) -> Result<(Value, NormalizedMetadata)> {
        info!("Fetching metadata: {}", metadata_uri);

        let response = self
            .request_client
            .get(metadata_uri)
            .timeout(Duration::from_secs(10))
            .send()
            .await;

        match response {
            Ok(resp) => {
                let raw_metadata: Value = resp.json().await?;

                info!("Metadata: {:?}", raw_metadata);

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
            Err(e) => {
                // Gérer l'erreur, y compris les timeouts
                if e.is_timeout() {
                    warn!("Metadata request timeout: {:?}", e);
                } else {
                    error!("Metadata request error : {:?}", e);
                }

                Err(e.into())
            }
        }
    }

    pub async fn get_contract_property_string(
        &mut self,
        contract_address: FieldElement,
        selector: FieldElement,
        calldata: Vec<FieldElement>,
        block: BlockId,
    ) -> Result<String> {
        match self
            .starknet_client
            .call_contract(contract_address, selector, calldata, block)
            .await
        {
            Ok(value) => parse_cairo_long_string(value),
            Err(_) => Err(anyhow!("Error calling contract")),
        }
    }
}

#[cfg(test)]
mod tests {

    use crate::storage_manager::DefaultStorage;
    use mockall::predicate::*;

    use super::*;
    use ark_starknet::client2::{IStarknetClient, MockIStarknetClient};
    use mockito::{mock, Matcher};
    use serde_json::json;

    #[tokio::test]
    async fn test_get_contract_property_string() {
        let rpc_url = &"";
        let mut mock = MockIStarknetClient::new(rpc_url).unwrap();
        let mut storage_manager = DefaultStorage::new();
        let mut metadata_manager = MetadataManager::new(&storage_manager, &mock);

        let contract_address = FieldElement::ONE;
        let selector_name = selector!("tokenURI");

        let test = metadata_manager
            .get_contract_property_string(
                contract_address,
                selector_name,
                vec![FieldElement::ZERO, FieldElement::ZERO],
                BlockId::Tag(BlockTag::Latest),
            )
            .await;

        // mock.expect_block_id_to_u64()
        // .times(1)
        // .returning(|_| Ok(42));
    }
}
