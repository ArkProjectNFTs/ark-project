use crate::{
    cairo_string_parser::parse_cairo_long_string,
    file_manager::{FileInfo, FileManager},
    storage::Storage,
    utils::{extract_metadata_from_headers, get_token_metadata},
};
use anyhow::{anyhow, Result};
use ark_starknet::{client::StarknetClient, format::to_hex_str, CairoU256};
use reqwest::Client as ReqwestClient;
use starknet::core::types::{BlockId, BlockTag, FieldElement};
use starknet::macros::selector;
use tracing::{debug, error};

/// `MetadataManager` is responsible for managing metadata information related to tokens.
/// It works with the underlying storage and Starknet client to fetch and update token metadata.
pub struct MetadataManager<'a, T: Storage, C: StarknetClient, F: FileManager> {
    storage: &'a T,
    starknet_client: &'a C,
    request_client: ReqwestClient,
    file_manager: &'a F,
}

pub struct MetadataImage {
    pub file_type: String,
    pub content_length: u64,
    pub is_cache_updated: bool,
}

#[derive(Copy, Clone)]
pub enum CacheOption {
    Cache,
    NoCache,
    Default,
}

/// Represents possible errors that can arise while working with metadata in the manager.
#[derive(Debug)]
pub enum MetadataError {
    DatabaseError,
    ParsingError,
    RequestTokenUriError,
    RequestImageError,
    EnvVarMissingError,
}

impl<'a, T: Storage, C: StarknetClient, F: FileManager> MetadataManager<'a, T, C, F> {
    /// Creates a new instance of `MetadataManager` with the given storage, Starknet client, and a new request client.
    pub fn new(storage: &'a T, starknet_client: &'a C, file_manager: &'a F) -> Self {
        MetadataManager {
            storage,
            starknet_client,
            request_client: ReqwestClient::new(),
            file_manager,
        }
    }

    /// Refreshes the metadata for a specific token within a given collection.
    ///
    /// This function retrieves the URI for the token, fetches its metadata, and updates the stored
    /// metadata in the database. If the metadata includes an image URI, this function also handles
    /// the fetching and optional caching of the image.
    ///
    /// # Parameters
    /// - `contract_address`: The address of the contract representing the token collection.
    /// - `token_id`: The ID of the token whose metadata needs to be refreshed.
    /// - `cache`: Specifies whether the token's image should be cached.
    ///
    /// # Returns
    /// - A `Result` indicating the success or failure of the metadata refresh operation.
    pub async fn refresh_token_metadata(
        &mut self,
        contract_address: FieldElement,
        token_id: CairoU256,
        cache: CacheOption,
        ipfs_gateway_uri: &str,
    ) -> Result<(), MetadataError> {
        let token_uri = self
            .get_token_uri(&token_id, contract_address)
            .await
            .map_err(|_| MetadataError::ParsingError)?;

        let token_metadata = get_token_metadata(&self.request_client, token_uri.as_str())
            .await
            .map_err(|_| MetadataError::RequestTokenUriError)?;

        if token_metadata.image.is_some() {
            let ipfs_url = ipfs_gateway_uri.to_string();
            let url = token_metadata
                .image
                .as_ref()
                .map(|s| s.replace("ipfs://", &ipfs_url))
                .unwrap_or_default();

            let image_name = url.rsplit('/').next().unwrap_or_default();
            let image_ext = image_name.rsplit('.').next().unwrap_or_default();

            self.fetch_token_image(url.as_str(), image_ext, cache, contract_address, &token_id)
                .await
                .map_err(|_| MetadataError::RequestImageError)?;
        }

        self.storage
            .register_token_metadata(&contract_address, token_id, token_metadata)
            .map_err(|_e| MetadataError::DatabaseError)?;

        Ok(())
    }

    /// Refreshes the metadata for all tokens in a given collection.
    ///
    /// This function retrieves a list of token IDs within a collection that
    /// lack metadata and then individually refreshes the metadata for each token.
    ///
    /// # Parameters
    /// - `contract_address`: The address of the contract representing the token collection.
    /// - `cache`: Specifies whether the token's image should be cached.
    ///
    /// # Returns
    /// - A `Result` indicating the success or failure of the metadata refresh operation.
    pub async fn refresh_collection_token_metadata(
        &mut self,
        contract_address: FieldElement,
        cache: CacheOption,
        ipfs_gateway_uri: &str,
    ) -> Result<(), MetadataError> {
        let token_ids = self
            .storage
            .find_token_ids_without_metadata_in_collection(contract_address)
            .map_err(|_| MetadataError::DatabaseError)?;

        for token_id in token_ids {
            self.refresh_token_metadata(contract_address, token_id, cache, ipfs_gateway_uri)
                .await?;
        }

        Ok(())
    }

    /// Fetches the image for a given token and optionally caches it.
    ///
    /// Depending on the provided `CacheOption`, this function might directly fetch
    /// the image's metadata without actually fetching the image, or it might fetch and cache the image.
    ///
    /// # Parameters
    /// - `url`: The URL from which the token image can be fetched.
    /// - `file_ext`: The file extension of the token image (e.g., "jpg", "png").
    /// - `cache`: Specifies whether the token's image should be cached.
    /// - `contract_address`: The address of the contract representing the token collection.
    /// - `token_id`: The ID of the token whose image is to be fetched.
    ///
    /// # Returns
    /// - A `Result` containing `MetadataImage` which provides details about the fetched image,
    ///   or an error if the image fetch operation fails.
    pub async fn fetch_token_image(
        &mut self,
        url: &str,
        file_ext: &str,
        cache: CacheOption,
        contract_address: FieldElement,
        token_id: &CairoU256,
    ) -> Result<MetadataImage> {
        match cache {
            CacheOption::NoCache => {
                let response = self.request_client.head(url).send().await?;
                let (content_type, content_length) =
                    extract_metadata_from_headers(response.headers())?;

                Ok(MetadataImage {
                    file_type: content_type,
                    content_length,
                    is_cache_updated: false,
                })
            }
            _ => {
                debug!("Fetching image... {}", url);
                let response = reqwest::get(url).await?;
                let headers = response.headers().clone();
                let bytes = response.bytes().await?;
                let (content_type, content_length) = extract_metadata_from_headers(&headers)?;

                self.file_manager
                    .save(&FileInfo {
                        name: format!("{}.{}", token_id.to_hex(), file_ext),
                        content: bytes.to_vec(),
                        dir_path: Some(to_hex_str(&contract_address)),
                    })
                    .await?;

                Ok(MetadataImage {
                    file_type: content_type,
                    content_length,
                    is_cache_updated: true,
                })
            }
        }
    }

    /// Retrieves the URI for a token based on its ID and the contract address.
    /// The function first checks the `tokenURI` selector and then the `token_uri` selector.
    /// If both checks fail, an error is returned indicating the token URI was not found.
    async fn get_token_uri(
        &mut self,
        token_id: &CairoU256,
        contract_address: FieldElement,
    ) -> Result<String> {
        let token_uri_cairo0 = self
            .get_contract_property_string(
                contract_address,
                selector!("tokenURI"),
                vec![token_id.low.into(), token_id.high.into()],
                BlockId::Tag(BlockTag::Latest),
            )
            .await?;

        if self.is_valid_uri(&token_uri_cairo0) {
            return Ok(token_uri_cairo0);
        }

        let token_uri_cairo1 = self
            .get_contract_property_string(
                contract_address,
                selector!("token_uri"),
                vec![token_id.low.into(), token_id.high.into()],
                BlockId::Tag(BlockTag::Latest),
            )
            .await?;

        if self.is_valid_uri(&token_uri_cairo1) {
            Ok(token_uri_cairo1)
        } else {
            error!("Token URI not found");
            Err(anyhow!("Token URI not found"))
        }
    }

    /// Checks if the given URI is valid.
    /// A URI is considered invalid if it's "undefined" or empty.
    fn is_valid_uri(&self, uri: &str) -> bool {
        uri != "undefined" && !uri.is_empty()
    }

    /// Gets a property string value from a Starknet contract.
    /// This function calls the contract and parses the returned value as a string.
    async fn get_contract_property_string(
        &mut self,
        contract_address: FieldElement,
        selector: FieldElement,
        calldata: Vec<FieldElement>,
        block: BlockId,
    ) -> Result<String> {
        let value = self
            .starknet_client
            .call_contract(contract_address, selector, calldata, block)
            .await
            .map_err(|_| anyhow!("Error calling contract"))?;

        parse_cairo_long_string(value).map_err(|_| anyhow!("Error parsing string"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::{file_manager::MockFileManager, storage::MockStorage};
    use ark_starknet::client::MockStarknetClient;
    use mockall::predicate::*;
    use reqwest::header::HeaderMap;
    use std::vec;

    #[test]
    fn test_extract_metadata_from_headers() {
        // Create a mock HeaderMap with some sample headers
        let mut headers = HeaderMap::new();
        headers.insert("Content-Type", "image/png".parse().unwrap());
        headers.insert("Content-Length", "12345".parse().unwrap());

        // Call the function under test
        let data = extract_metadata_from_headers(&headers);

        // Assert that the returned values match the headers we set
        assert!(data.is_ok());

        let (content_type, content_length) = data.unwrap();

        assert_eq!(content_type, "image/png");
        assert_eq!(content_length, 12345u64);
    }

    #[tokio::test]
    async fn test_get_token_uri() {
        // SETUP: Mocking and Initializing
        let mut mock_client = MockStarknetClient::default();
        let storage_manager = MockStorage::default();
        let mock_file = MockFileManager::default();

        mock_client
            .expect_call_contract()
            .times(1)
            .returning(|_, _, _, _| {
                Ok(vec![
                    FieldElement::from_dec_str("4").unwrap(),
                    FieldElement::from_hex_be("0x68").unwrap(),
                    FieldElement::from_hex_be("0x74").unwrap(),
                    FieldElement::from_hex_be("0x74").unwrap(),
                    FieldElement::from_hex_be("0x70").unwrap(),
                ])
            });

        let mut metadata_manager = MetadataManager::new(&storage_manager, &mock_client, &mock_file);

        // EXECUTION: Call the function under test
        let result = metadata_manager
            .get_token_uri(
                &CairoU256 { low: 0, high: 1 },
                FieldElement::from_hex_be(
                    "0x0727a63f78ee3f1bd18f78009067411ab369c31dece1ae22e16f567906409905",
                )
                .unwrap(),
            )
            .await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_refresh_collection_token_metadata() {
        // SETUP: Mocking and Initializing
        let mut mock_client = MockStarknetClient::default();
        let mut mock_storage = MockStorage::default();
        let mock_file = MockFileManager::default();

        let contract_address = FieldElement::ONE;
        let ipfs_gateway_uri = "https://ipfs.example.com";

        // Mocking expected behaviors
        mock_storage
            .expect_find_token_ids_without_metadata_in_collection()
            .times(1)
            .with(eq(contract_address))
            .returning(|_| Ok(vec![CairoU256 { low: 1, high: 0 }]));

        mock_client
            .expect_call_contract()
            .times(1)
            .with(always(), always(), always(), always())
            .returning(|_, _, _, _| {
                Ok(vec![
                    FieldElement::from_dec_str("4").unwrap(),
                    FieldElement::from_hex_be("0x68").unwrap(),
                    FieldElement::from_hex_be("0x74").unwrap(),
                    FieldElement::from_hex_be("0x74").unwrap(),
                    FieldElement::from_hex_be("0x70").unwrap(),
                ])
            });

        mock_storage
            .expect_register_token_metadata()
            .times(1)
            .with(always(), always(), always())
            .returning(|_, _, _| Ok(()));

        let mut metadata_manager = MetadataManager::new(&mock_storage, &mock_client, &mock_file);

        // EXECUTION: Call the function under test
        let result = metadata_manager
            .refresh_collection_token_metadata(
                contract_address,
                CacheOption::NoCache,
                ipfs_gateway_uri,
            )
            .await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_contract_property_string() {
        // SETUP: Mocking and Initializing
        let mut mock_client = MockStarknetClient::default();
        let mock_file = MockFileManager::default();

        let contract_address = FieldElement::ONE;
        let selector_name = selector!("tokenURI");

        // Configure the mock client to expect a call to 'call_contract' and return a predefined result
        mock_client
            .expect_call_contract()
            .times(1)
            .with(
                eq(contract_address),
                eq(selector_name),
                eq(vec![FieldElement::ZERO, FieldElement::ZERO]),
                eq(BlockId::Tag(BlockTag::Latest)),
            )
            .returning(|_, _, _, _| {
                Ok(vec![
                    FieldElement::from_dec_str("4").unwrap(),
                    FieldElement::from_hex_be("0x68").unwrap(),
                    FieldElement::from_hex_be("0x74").unwrap(),
                    FieldElement::from_hex_be("0x74").unwrap(),
                    FieldElement::from_hex_be("0x70").unwrap(),
                ])
            });

        let storage_manager = MockStorage::default();
        let mut metadata_manager = MetadataManager::new(&storage_manager, &mock_client, &mock_file);

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
