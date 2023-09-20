use crate::{
    cairo_string_parser::parse_cairo_long_string,
    file_manager::{FileInfo, FileManager},
    metadata::get_token_metadata,
    utils::extract_metadata_from_headers,
};
use anyhow::{anyhow, Result};
use ark_starknet::client::StarknetClient;
use ark_storage::{storage_manager::StorageManager, types::TokenId};
use log::{debug, error, info};
use reqwest::Client as ReqwestClient;
use starknet::core::types::{BlockId, BlockTag, FieldElement};
use starknet::macros::selector;
use std::env;

/// `MetadataManager` is responsible for managing metadata information related to tokens.
/// It works with the underlying storage and Starknet client to fetch and update token metadata.
pub struct MetadataManager<'a, T: StorageManager, C: StarknetClient, F: FileManager> {
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

/// Represents possible errors that can arise while working with metadata in the manager.
#[derive(Debug)]
pub enum MetadataError {
    DatabaseError,
    ParsingError,
    RequestTokenUriError,
    RequestImageError,
    EnvVarMissingError,
}

impl<'a, T: StorageManager, C: StarknetClient, F: FileManager> MetadataManager<'a, T, C, F> {
    /// Creates a new instance of `MetadataManager` with the given storage, Starknet client, and a new request client.
    pub fn new(storage: &'a T, starknet_client: &'a C, file_manager: &'a F) -> Self {
        MetadataManager {
            storage,
            starknet_client,
            request_client: ReqwestClient::new(),
            file_manager,
        }
    }

    /// Refreshes the metadata for a given token.
    /// ...
    /// # Parameters
    /// - `contract_address`: The address of the contract.
    /// - `token_id_low`: The low end of the token ID range.
    /// - `token_id_high`: The high end of the token ID range.
    /// - `force_refresh`: Whether to force a refresh of the metadata.
    /// ...
    /// # Returns
    /// - `Ok(())` if the metadata is successfully refreshed.
    /// - `Err` variant of `MetadataError` if there's an issue during the refresh process.
    pub async fn refresh_token_metadata(
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

        let token_metadata = get_token_metadata(&self.request_client, token_uri.as_str())
            .await
            .map_err(|_| MetadataError::RequestTokenUriError)?;

        if token_metadata.image.is_some() {
            let ipfs_url =
                env::var("IPFS_GATEWAY_URI").map_err(|_| MetadataError::EnvVarMissingError)?;

            let url = token_metadata
                .image
                .as_ref()
                .map(|s| s.replace("ipfs://", &ipfs_url))
                .unwrap_or_default();

            let image_name = url.rsplit('/').next().unwrap_or_default();
            let image_ext = image_name.rsplit('.').next().unwrap_or_default();

            self.fetch_token_image(
                url.as_str(),
                image_ext,
                cache_image.unwrap_or(false),
                contract_address.clone(),
                TokenId {
                    low: token_id_low,
                    high: token_id_high,
                },
            )
            .await
            .map_err(|_| MetadataError::RequestImageError)?;
        }

        self.storage
            .register_token_metadata(
                &contract_address,
                TokenId {
                    low: token_id_low,
                    high: token_id_high,
                },
                token_metadata,
            )
            .map_err(|_e| MetadataError::DatabaseError)?;

        Ok(())
    }

    pub async fn fetch_token_image(
        &mut self,
        url: &str,
        file_ext: &str,
        cache_image: bool,
        contract_address: FieldElement,
        token_id: TokenId,
    ) -> Result<MetadataImage> {
        if !cache_image {
            let response = self.request_client.head(url).send().await?;
            let (content_type, content_length) = extract_metadata_from_headers(response.headers())?;

            return Ok(MetadataImage {
                file_type: content_type,
                content_length,
                is_cache_updated: false,
            });
        } else {
            debug!("Fetching image... {}", url);
            let response = reqwest::get(url).await?;
            let headers = response.headers().clone();
            let bytes = response.bytes().await?;
            let (content_type, content_length) = extract_metadata_from_headers(&headers)?;

            self.file_manager
                .save(&FileInfo {
                    name: format!("{}.{}", token_id.format().token_id, file_ext),
                    content: bytes.to_vec(),
                    dir_path: Some(String::from(format!("{:#064x}", contract_address))),
                })
                .await?;

            Ok(MetadataImage {
                file_type: content_type,
                content_length,
                is_cache_updated: true,
            })
        }
    }

    /// Retrieves the URI for a token based on its ID and the contract address.
    /// The function first checks the `tokenURI` selector and then the `token_uri` selector.
    /// If both checks fail, an error is returned indicating the token URI was not found.
    async fn get_token_uri(
        &mut self,
        token_id_low: FieldElement,
        token_id_high: FieldElement,
        contract_address: FieldElement,
    ) -> Result<String> {
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

    /// Fetches the token URI by interacting with the Starknet contract.
    /// This function calls the contract with the provided selector to obtain the URI.
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
    use super::*;
    use crate::file_manager::MockFileManager;

    use ark_starknet::client::MockStarknetClient;
    use ark_storage::storage_manager::DefaultStorage;
    use ark_storage::storage_manager::MockStorageManager;
    use mockall::predicate::*;
    use reqwest::header::HeaderMap;
    use std::vec;

    // #[tokio::test]
    // async fn test_fetch_token_image_no_cache() {
    //     let mock_storage = MockStorageManager::default();
    //     let mock_client = MockStarknetClient::default();
    //     let mock_file = MockFileManager::default();

    //     let mut metadata_manager = MetadataManager::new(&mock_storage, &mock_client, &mock_file);

    //     let test_url = "http://example.com/test.png";

    //     // Mock the HTTP HEAD request to fetch metadata.
    //     let mock_request_client = reqwest::Client::default();
    //     mock_request_client
    //         .expect_head()
    //         .with(eq(test_url))
    //         .returning(|_| {
    //             let mut headers = HeaderMap::new();
    //             headers.insert("Content-Type", "image/png".parse().unwrap());
    //             headers.insert("Content-Length", "12345".parse().unwrap());
    //             Ok(reqwest::Response::builder()
    //                 .status(StatusCode::OK)
    //                 .headers(headers)
    //                 .body("".into())
    //                 .unwrap())
    //         });

    //     let result = metadata_manager
    //         .fetch_token_image(
    //             test_url,
    //             "png",
    //             false,
    //             FieldElement::ZERO,
    //             TokenId::default(),
    //         )
    //         .await;

    //     assert!(result.is_ok());
    //     let metadata_image = result.unwrap();
    //     assert_eq!(metadata_image.file_type, "image/png");
    //     assert_eq!(metadata_image.content_length, 12345u64);
    //     assert_eq!(metadata_image.is_cache_updated, false);
    // }

    // #[tokio::test]
    // async fn test_fetch_token_image_cache_success() {
    //     let mock_storage = MockStorageManager::default();
    //     let mock_client = MockStarknetClient::default();
    //     let mut mock_file = MockFileManager::default();

    //     let mut metadata_manager = MetadataManager::new(&mock_storage, &mock_client, &mock_file);

    //     let test_url = "http://example.com/test.png";
    //     let test_body = "test_image_content";

    //     mock_file.expect_save().returning(|_| Ok(()));

    //     let mock_request_client = reqwest::Client::default();
    //     mock_request_client
    //         .expect_get()
    //         .with(eq(test_url))
    //         .returning(|_| {
    //             let mut headers = HeaderMap::new();
    //             headers.insert("Content-Type", "image/png".parse().unwrap());
    //             headers.insert("Content-Length", "12345".parse().unwrap());
    //             Ok(reqwest::Response::builder()
    //                 .status(StatusCode::OK)
    //                 .headers(headers)
    //                 .body(test_body.into())
    //                 .unwrap())
    //         });

    //     let result = metadata_manager
    //         .fetch_token_image(
    //             test_url,
    //             "png",
    //             true,
    //             FieldElement::ZERO,
    //             TokenId::default(),
    //         )
    //         .await;

    //     assert!(result.is_ok());
    //     let metadata_image = result.unwrap();
    //     assert_eq!(metadata_image.file_type, "image/png");
    //     assert_eq!(metadata_image.content_length, 12345u64);
    //     assert_eq!(metadata_image.is_cache_updated, true);
    // }

    // #[tokio::test]
    // async fn test_fetch_token_image_cache_fail() {
    //     let mock_storage = MockStorageManager::default();
    //     let mock_client = MockStarknetClient::default();
    //     let mock_file = MockFileManager::default();

    //     let mut metadata_manager = MetadataManager::new(&mock_storage, &mock_client, &mock_file);

    //     let test_url = "http://example.com/test.png";

    //     let mock_request_client = reqwest::Client::default();
    //     mock_request_client
    //         .expect_get()
    //         .with(eq(test_url))
    //         .returning(|_| {
    //             Err(reqwest::Error::new(
    //                 reqwest::ErrorKind::Request,
    //                 "Test Error",
    //             ))
    //         });

    //     let result = metadata_manager
    //         .fetch_token_image(
    //             test_url,
    //             "png",
    //             true,
    //             FieldElement::ZERO,
    //             TokenId::default(),
    //         )
    //         .await;

    //     assert!(result.is_err());
    // }

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
    async fn test_refresh_token_metadata() {
        // SETUP: Mocking and Initializing
        let mut mock_client = MockStarknetClient::default();
        let mut mock_storage = MockStorageManager::default();
        let mock_file = MockFileManager::default();

        let token_id = TokenId {
            low: FieldElement::ZERO,
            high: FieldElement::ONE,
        };

        // Mock expected calls
        mock_client
            .expect_call_contract() // mocking the call inside `get_token_uri`
            .times(1)
            .returning(|_, _, _, _| {
                Ok(vec![
                    FieldElement::from_dec_str(&"4").unwrap(),
                    FieldElement::from_hex_be("0x68").unwrap(),
                    FieldElement::from_hex_be("0x74").unwrap(),
                    FieldElement::from_hex_be("0x74").unwrap(),
                    FieldElement::from_hex_be("0x70").unwrap(),
                ])
            });

        mock_storage
            .expect_has_token_metadata()
            .times(1)
            .returning(move |_, _| Ok(false));

        mock_storage
            .expect_register_token_metadata()
            .times(1)
            .returning(|_, _, _| Ok(()));

        let contract_address = FieldElement::from_hex_be(
            "0x0727a63f78ee3f1bd18f78009067411ab369c31dece1ae22e16f567906409905",
        )
        .unwrap();
        let mut metadata_manager = MetadataManager::new(&mock_storage, &mock_client, &mock_file);

        // EXECUTION: Call the function under test
        let result = metadata_manager
            .refresh_token_metadata(
                contract_address.clone(),
                token_id.low.clone(),
                token_id.high.clone(),
                Some(false),
                Some(false),
            )
            .await;

        // ASSERTION: Verify the outcome
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_token_uri() {
        // SETUP: Mocking and Initializing
        let mut mock_client = MockStarknetClient::default();
        let storage_manager = DefaultStorage::new();
        let mock_file = MockFileManager::default();

        mock_client
            .expect_call_contract()
            .times(1)
            .returning(|_, _, _, _| {
                Ok(vec![
                    FieldElement::from_dec_str(&"4").unwrap(),
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
                FieldElement::ZERO,
                FieldElement::ONE,
                FieldElement::from_hex_be(
                    "0x0727a63f78ee3f1bd18f78009067411ab369c31dece1ae22e16f567906409905",
                )
                .unwrap(),
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
