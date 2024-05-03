use crate::{
    file_manager::{FileInfo, FileManager},
    storage::Storage,
    types::StorageError,
    utils::{extract_metadata_from_headers, file_extension_from_mime_type, get_token_metadata},
};
use anyhow::{anyhow, Result};
use ark_starknet::{cairo_string_parser::parse_cairo_string, client::StarknetClient, CairoU256};
use reqwest::Client as ReqwestClient;
use starknet::core::types::{BlockId, BlockTag, FieldElement};
use starknet::macros::selector;
use std::time::Duration;
use tracing::{debug, error, info, trace};

/// `MetadataManager` is responsible for managing metadata information related to tokens.
/// It works with the underlying storage and Starknet client to fetch and update token metadata.
pub struct MetadataManager<'a, T: Storage, C: StarknetClient, F: FileManager> {
    storage: &'a T,
    starknet_client: &'a C,
    request_client: ReqwestClient,
    file_manager: &'a F,
}

pub struct MetadataMedia {
    pub file_type: String,
    pub content_length: u64,
    pub is_cache_updated: bool,
    pub media_key: Option<String>,
}

#[derive(Copy, Clone)]
pub enum ImageCacheOption {
    Save,
    DoNotSave,
}

/// Represents possible errors that can arise while working with metadata in the manager.
#[derive(Debug, thiserror::Error)]
pub enum MetadataError {
    #[error("Database operation failed: {0}")]
    DatabaseError(StorageError),

    #[error("Failed to parse data: {0}")]
    ParsingError(String),

    #[error("Failed to request token URI: {0}")]
    RequestTokenUriError(String),

    #[error("Failed to request image: {0}")]
    RequestImageError(String),

    #[error("Required environment variable is missing: {0}")]
    EnvVarMissingError(String),
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
        cache: ImageCacheOption,
        ipfs_gateway_uri: &str,
        image_timeout: Duration,
        request_referrer: &str,
    ) -> Result<(), MetadataError> {
        trace!(
            "refresh_token_metadata(contract_address=0x{:064x}, token_id={})",
            contract_address,
            token_id.to_decimal(false),
        );

        let token_uri = self
            .get_token_uri(&token_id, contract_address)
            .await
            .map_err(|err| MetadataError::ParsingError(err.to_string()))?;

        trace!("Token URI: {}", token_uri);

        let mut token_metadata = get_token_metadata(
            &self.request_client,
            token_uri.as_str(),
            ipfs_gateway_uri,
            image_timeout,
            request_referrer,
        )
        .await
        .map_err(|err| MetadataError::RequestTokenUriError(err.to_string()))?;

        // Check if there is an image to fetch in the metadata.
        if let Some(image_uri) = &token_metadata.normalized.image {
            if let Ok(metadata_image) = self
                .fetch_metadata_media(
                    image_uri.as_str(),
                    cache,
                    &token_id,
                    image_timeout,
                    ipfs_gateway_uri,
                )
                .await
            {
                let is_video_type = matches!(
                    metadata_image.file_type.as_str(),
                    "video/mpeg"
                        | "video/mp4"
                        | "video/webm"
                        | "video/ogg"
                        | "video/quicktime"
                        | "video/x-flv"
                        | "video/3gpp"
                        | "video/x-msvideo"
                );

                if is_video_type {
                    token_metadata.normalized.animation_mime_type = Some(metadata_image.file_type);
                    token_metadata.normalized.animation_url = Some(image_uri.to_string());
                    token_metadata.normalized.animation_key = metadata_image.media_key;
                } else {
                    token_metadata
                        .normalized
                        .image_key
                        .clone_from(&metadata_image.media_key);
                    token_metadata.normalized.image_mime_type =
                        Some(metadata_image.file_type.clone());

                    if let Some(animation_uri) = &token_metadata.normalized.animation_url {
                        if let Ok(metadata_animation) = self
                            .fetch_metadata_media(
                                animation_uri.as_str(),
                                cache,
                                &token_id,
                                image_timeout,
                                ipfs_gateway_uri,
                            )
                            .await
                        {
                            token_metadata.normalized.animation_mime_type =
                                Some(metadata_animation.file_type);
                            token_metadata.normalized.animation_url =
                                Some(animation_uri.to_string());
                            token_metadata.normalized.animation_key = metadata_animation.media_key;
                        }
                    }
                }
            }
        }

        self.storage
            .register_token_metadata(&contract_address, token_id, token_metadata)
            .await
            .map_err(MetadataError::DatabaseError)?;

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
        cache: ImageCacheOption,
        ipfs_gateway_uri: &str,
        image_timeout: Duration,
        request_referrer: &str,
    ) -> Result<(), MetadataError> {
        let results = self
            .storage
            .find_token_ids_without_metadata(Some(contract_address))
            .await
            .map_err(MetadataError::DatabaseError)?;

        for (contract_address, token_id) in results {
            self.refresh_token_metadata(
                contract_address,
                token_id,
                cache,
                ipfs_gateway_uri,
                image_timeout,
                request_referrer,
            )
            .await?;
        }

        Ok(())
    }

    /// Fetches the media for a given token and optionally caches it.
    ///
    /// Depending on the provided `CacheOption`, this function might directly fetch
    /// the media's metadata without actually fetching the media, or it might fetch and cache the media.
    ///
    /// # Parameters
    /// - `url`: The URL from which the token media can be fetched.
    /// - `file_ext`: The file extension of the token media (e.g., "jpg", "png").
    /// - `cache`: Specifies whether the token's media should be cached.
    /// - `contract_address`: The address of the contract representing the token collection.
    /// - `token_id`: The ID of the token whose media is to be fetched.
    ///
    /// # Returns
    /// - A `Result` containing `MetadataImage` which provides details about the fetched media,
    ///   or an error if the media fetch operation fails.
    pub async fn fetch_metadata_media(
        &mut self,
        raw_url: &str,
        cache: ImageCacheOption,
        token_id: &CairoU256,
        timeout: Duration,
        ipfs_url: &str,
    ) -> Result<MetadataMedia> {
        info!("Fetching media... {}", raw_url);

        let url = raw_url.replace("ipfs://", ipfs_url);

        match cache {
            ImageCacheOption::DoNotSave => {
                let response = self.request_client.head(url).send().await?;
                let (content_type, content_length) =
                    extract_metadata_from_headers(response.headers())?;

                Ok(MetadataMedia {
                    file_type: content_type,
                    content_length,
                    is_cache_updated: false,
                    media_key: None,
                })
            }
            ImageCacheOption::Save => {
                let response = self.request_client.get(url).timeout(timeout).send().await?;

                let headers = response.headers().clone();
                let bytes = response.bytes().await?;
                let (content_type, content_length) = extract_metadata_from_headers(&headers)?;

                info!(
                    "Image: Content-Type={}, Content-Length={}",
                    content_type, content_length
                );

                let file_ext = file_extension_from_mime_type(content_type.as_str());

                debug!(
                    "Image: Content-Type={}, Content-Length={}, File-Ext={}",
                    content_type, content_length, file_ext
                );

                let media_key = self
                    .file_manager
                    .save(&FileInfo {
                        name: format!("{}.{}", token_id.to_decimal(false), file_ext),
                        content: bytes.to_vec(),
                        dir_path: None,
                    })
                    .await?;

                Ok(MetadataMedia {
                    file_type: content_type,
                    content_length,
                    is_cache_updated: true,
                    media_key: Some(media_key),
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
                BlockId::Tag(BlockTag::Pending),
            )
            .await;

        match token_uri_cairo0 {
            Ok(token_uri_cairo0) => {
                if self.is_valid_uri(&token_uri_cairo0) {
                    return Ok(token_uri_cairo0);
                } else {
                    trace!("tokenURI for token ID {} at contract address 0x{:064x} resulted in an invalid URI: {}", token_id.to_decimal(false), contract_address, token_uri_cairo0);
                }
            }
            Err(err) => {
                trace!(
                    "Failed to retrieve tokenURI for token ID {} at contract address 0x{:064x}\nError: {:?}",
                    token_id.to_decimal(false),
                    contract_address,
                    err
                );

                match self
                    .get_contract_property_string(
                        contract_address,
                        selector!("token_uri"),
                        vec![token_id.low.into(), token_id.high.into()],
                        BlockId::Tag(BlockTag::Pending),
                    )
                    .await
                {
                    Ok(token_uri_cairo1) => {
                        if self.is_valid_uri(&token_uri_cairo1) {
                            return Ok(token_uri_cairo1);
                        } else {
                            trace!("token_uri for token ID {} at contract address 0x{:064x} resulted in an invalid URI: {}", token_id.to_decimal(false), contract_address, token_uri_cairo1);
                        }
                    }
                    Err(_) => {
                        return Err(anyhow!(
                            "Unable to retrieve the token ID {} from contract address 0x{:064x} using both 'token_uri' and 'tokenURI' methods",
                            token_id.to_decimal(false),
                            contract_address
                        ));
                    }
                }
            }
        }
        Err(anyhow!(
            "Token URI not found for token ID {} at contract address {}",
            token_id.to_decimal(false),
            contract_address
        ))
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
        trace!(
            "get_contract_property_string(contract_address=0x{:064x}, selector=0x{:064x}, calldata={:?}, block={:?})",
            contract_address, selector, calldata, block
        );

        let value = self
            .starknet_client
            .call_contract(contract_address, selector, calldata, block)
            .await
            .map_err(|e| anyhow!("Error calling contract: {}", e.to_string()))?;

        trace!("Call contract: value={:?}", value);

        parse_cairo_string(value).map_err(|_| anyhow!("Error parsing string"))
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
        let request_referrer = "https://arkproject.dev";

        // Mocking expected behaviors
        mock_storage
            .expect_find_token_ids_without_metadata()
            .times(1)
            .with(eq(Some(contract_address)))
            .returning(|_| Ok(vec![(FieldElement::ONE, CairoU256 { low: 1, high: 0 })]));

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
                ImageCacheOption::DoNotSave,
                ipfs_gateway_uri,
                Duration::from_secs(5),
                request_referrer,
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
