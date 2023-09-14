use crate::cairo_strings::parse_cairo_long_string;
use crate::normalize_metadata::normalize_metadata;
use anyhow::{anyhow, Result};
use ark_starknet::client::StarknetClient;
use ark_storage::storage_manager::StorageManager;
use log::info;
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

    pub async fn refresh_metadata(
        &mut self,
        contract_address: FieldElement,
        token_id_low: FieldElement,
        token_id_high: FieldElement,
        block_id: BlockId,
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

    pub async fn fetch_metadata(
        &mut self,
        metadata_uri: &str,
        initial_metadata_uri: &str,
    ) -> Result<(Value, NormalizedMetadata)> {
        info!("Fetching metadata: {}", metadata_uri);

        let response = self
            .request_client
            .get(metadata_uri)
            .timeout(Duration::from_secs(3))
            .send()
            .await;

        match response {
            Ok(resp) => match resp.json::<Value>().await {
                Ok(raw_metadata) => {
                    let normalized_metadata =
                        normalize_metadata(initial_metadata_uri.to_string(), raw_metadata.clone())?;
                    Ok((raw_metadata, normalized_metadata))
                }
                Err(e) => Err(e.into()),
            },
            Err(e) => Err(e.into()),
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
    use std::vec;

    use super::*;

    use ark_starknet::client::MockStarknetClient;
    use ark_storage::storage_manager::DefaultStorage;
    use mockall::predicate::*;

    #[tokio::test]
    async fn test_get_contract_property_string() {
        let mut mock = MockStarknetClient::new();

        mock.expect_call_contract()
            .times(1)
            .returning(|_, _, _, _| Ok(vec![]));

        let storage_manager = DefaultStorage::new();
        let mut metadata_manager = MetadataManager::new(&storage_manager, &mock);

        let contract_address = FieldElement::ONE;
        let selector_name = selector!("tokenURI");

        let value = metadata_manager
            .get_contract_property_string(
                contract_address,
                selector_name,
                vec![FieldElement::ZERO, FieldElement::ZERO],
                BlockId::Tag(BlockTag::Latest),
            )
            .await;

    }
}
