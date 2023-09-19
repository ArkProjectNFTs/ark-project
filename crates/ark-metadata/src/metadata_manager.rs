use crate::cairo_string_parser::parse_cairo_long_string;
use crate::metadata::{get_token_metadata, MetadataImage};

use anyhow::{anyhow, Result};
use ark_starknet::client::StarknetClient;
use ark_storage::storage_manager::StorageManager;
use ark_storage::types::TokenId;
use log::{error, info};
use reqwest::Client as ReqwestClient;
use starknet::core::types::{BlockId, BlockTag, FieldElement};
use starknet::macros::selector;

pub struct MetadataManager<'a, T: StorageManager, C: StarknetClient> {
    storage: &'a T,
    starknet_client: &'a C,
    request_client: ReqwestClient,
}

#[derive(Debug)]
pub enum MetadataError {
    DatabaseError,
    ParsingError,
    RequestError,
}

impl<'a, T: StorageManager, C: StarknetClient> MetadataManager<'a, T, C> {
    pub fn new(storage: &'a T, starknet_client: &'a C) -> Self {
        MetadataManager {
            storage,
            starknet_client,
            request_client: ReqwestClient::new(),
        }
    }

    /// Refreshes the metadata for a given token.
    ///
    /// - `contract_address`: The address of the contract.
    /// - `token_id_low`: The low end of the token ID range.
    /// - `token_id_high`: The high end of the token ID range.
    /// - `block_id`: The ID of the block.
    /// - `force_refresh`: Whether to force a refresh of the metadata.
    ///
    /// Returns an `Err` variant of `MetadataError` if there's a problem in parsing the token URI, fetching metadata, or database interaction.
    pub async fn refresh_metadata_for_token(
        &mut self,
        contract_address: FieldElement,
        token_id_low: FieldElement,
        token_id_high: FieldElement,
        force_refresh: Option<bool>,
        cache_image: Option<bool>,
    ) -> Result<(), MetadataError> {
        let token_uri = self
            .get_token_uri(token_id_low, token_id_high, contract_address)
            .await
            .map_err(|_| MetadataError::ParsingError)?;

        if !force_refresh.unwrap_or(false) {
            let has_token_metadata = self
                .storage
                .has_token_metadata(
                    contract_address,
                    TokenId {
                        low: token_id_low,
                        high: token_id_high,
                    },
                )
                .map_err(|_| MetadataError::DatabaseError)?;

            if has_token_metadata {
                return Ok(());
            }
        }

        let token_metadata = get_token_metadata(token_uri.as_str())
            .await
            .map_err(|_| MetadataError::RequestError)?;

        // if token_metadata.image.is_some() {
        //     let url = token_metadata.image.clone().unwrap();
        //     let _ = self
        //         .fetch_token_image(url.as_str(), cache_image.unwrap_or(false))
        //         .await;
        // }

        self.storage
            .register_token_metadata(token_metadata)
            .map_err(|_e| MetadataError::DatabaseError)?;

        Ok(())
    }

    async fn get_token_uri(
        &mut self,
        token_id_low: FieldElement,
        token_id_high: FieldElement,
        contract_address: FieldElement,
    ) -> Result<String> {

        info!("get_token_uri");

        let token_uri_cairo0 = self
            .fetch_token_uri(
                selector!("tokenURI"),
                token_id_low.clone(),
                token_id_high.clone(),
                contract_address.clone(),
            )
            .await?;

        if self.is_valid_uri(&token_uri_cairo0) {
            return Ok(token_uri_cairo0);
        }

        let token_uri_cairo1 = self
            .fetch_token_uri(
                selector!("token_uri"),
                token_id_low,
                token_id_high,
                contract_address,
            )
            .await?;

        if self.is_valid_uri(&token_uri_cairo1) {
            return Ok(token_uri_cairo1);
        } else {
            error!("Token URI not found");
            return Err(anyhow!("Token URI not found"));
        }
    }

    async fn fetch_token_uri(
        &mut self,
        selector: FieldElement,
        token_id_low: FieldElement,
        token_id_high: FieldElement,
        contract_address: FieldElement,
    ) -> Result<String> {
        self.get_contract_property_string(
            contract_address,
            selector,
            vec![token_id_low, token_id_high],
            BlockId::Tag(BlockTag::Latest),
        )
        .await
    }

    fn is_valid_uri(&self, uri: &String) -> bool {
        uri != "undefined" && !uri.is_empty()
    }

    async fn fetch_token_image(&mut self, url: &str, cache_image: bool) -> Result<MetadataImage> {
        if !cache_image {
            let response = reqwest::Client::new().head(url).send().await?;

            let content_type = match response.headers().get(reqwest::header::CONTENT_TYPE) {
                Some(content_type) => match content_type.to_str() {
                    Ok(value) => value.to_string(),
                    Err(_) => String::from(""),
                },
                None => String::from(""),
            };

            let content_length = match response.headers().get(reqwest::header::CONTENT_LENGTH) {
                Some(content_length) => match content_length.to_str() {
                    Ok(value) => value.parse::<u64>().unwrap_or(0),
                    Err(_) => 0,
                },
                None => 0,
            };

            return Ok(MetadataImage {
                content_length,
                file_type: content_type,
            });
        }

        Ok(MetadataImage {
            content_length: 0,
            file_type: String::from(""),
        })
    }

    async fn get_contract_property_string(
        &mut self,
        contract_address: FieldElement,
        selector: FieldElement,
        calldata: Vec<FieldElement>,
        block: BlockId,
    ) -> Result<String> {

        info!("get_contract_property_string");

        match self
            .starknet_client
            .call_contract(contract_address, selector, calldata, block)
            .await
        {
            Ok(value) => parse_cairo_long_string(value),
            Err(_) => {
                error!("Error calling contract");
                Err(anyhow!("Error calling contract"))
            }
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

    // #[tokio::test]
    // async fn test_get_token_uri() {
    //     // SETUP: Mocking and Initializing
    //     let mut mock_client = MockStarknetClient::new();
    //     let storage_manager = DefaultStorage::new();

    //     mock_client
    //     .expect_call_contract()
    //     .times(1)
    //     .returning(|_, _, _, _| {
    //         Ok(vec![
    //             FieldElement::from_dec_str(&"4").unwrap(),
    //             FieldElement::from_hex_be("0x68").unwrap(),
    //             FieldElement::from_hex_be("0x74").unwrap(),
    //             FieldElement::from_hex_be("0x74").unwrap(),
    //             FieldElement::from_hex_be("0x70").unwrap(),
    //         ])
    //     });

    //     let mut metadata_manager = MetadataManager::new(&storage_manager, &mock_client);

    //     // EXECUTION: Call the function under test
    //     let result = metadata_manager
    //         .get_token_uri(
    //             FieldElement::ZERO,
    //             FieldElement::ONE,
    //             FieldElement::from_hex_be("0x0727a63f78ee3f1bd18f78009067411ab369c31dece1ae22e16f567906409905").unwrap())
    //         .await;

    //     assert!(result.is_ok());
    // }

    #[tokio::test]
    async fn test_get_contract_property_string() {
        // SETUP: Mocking and Initializing
        let mut mock_client = MockStarknetClient::default();

        let contract_address = FieldElement::ONE;
        let selector_name = selector!("tokenURI");

        // Configure the mock client to expect a call to 'call_contract' and return a predefined result
        mock_client
            .expect_call_contract()
            .times(1)
            .with(
                eq(contract_address.clone()),
                eq(selector_name.clone()),
                eq(vec![FieldElement::ZERO, FieldElement::ZERO]),
                eq(BlockId::Tag(BlockTag::Latest)),
            )
            .returning(|_, _, _, _| {
                Ok(vec![
                    FieldElement::from_dec_str(&"4").unwrap(),
                    FieldElement::from_hex_be("0x68").unwrap(),
                    FieldElement::from_hex_be("0x74").unwrap(),
                    FieldElement::from_hex_be("0x74").unwrap(),
                    FieldElement::from_hex_be("0x70").unwrap(),
                ])
            });

        let storage_manager = DefaultStorage::new();
        let mut metadata_manager = MetadataManager::new(&storage_manager, &mock_client);

        // EXECUTION: Call the function under test
        let result = metadata_manager
            .get_contract_property_string(
                contract_address,
                selector_name,
                vec![FieldElement::ZERO, FieldElement::ZERO],
                BlockId::Tag(BlockTag::Latest),
            )
            .await;

        // ASSERTION: Verify the outcome
        let parsed_string = result.expect("Failed to get contract property string");
        assert_eq!(parsed_string, "http");
    }
}
