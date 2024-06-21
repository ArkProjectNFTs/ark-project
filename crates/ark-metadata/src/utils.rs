use crate::types::{MetadataType, NormalizedMetadata, TokenMetadata};
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use reqwest::header::{HeaderMap, CONTENT_LENGTH, CONTENT_TYPE};
use reqwest::Client;
use std::time::Duration;
use tracing::{debug, error, trace};

pub async fn get_token_metadata(
    client: &Client,
    uri: &str,
    ipfs_gateway_uri: &str,
    request_timeout_duration: Duration,
    request_referrer: &str,
) -> Result<TokenMetadata> {
    let metadata_type = get_metadata_type(uri);
    let metadata = match metadata_type {
        MetadataType::Ipfs(uri) => {
            let ipfs_hash = uri.trim_start_matches("ipfs://");
            let complete_uri = format!("{}{}", ipfs_gateway_uri, ipfs_hash);
            trace!("Fetching metadata from IPFS: {}", complete_uri.as_str());
            fetch_metadata(
                complete_uri.as_str(),
                client,
                request_timeout_duration,
                request_referrer,
            )
            .await?
        }
        MetadataType::Http(uri) => {
            trace!("Fetching metadata from HTTPS: {}", uri.as_str());
            fetch_metadata(&uri, client, request_timeout_duration, request_referrer).await?
        }
        MetadataType::OnChain(uri) => {
            trace!("Fetching on-chain metadata: {}", uri);
            fetch_onchain_metadata(&uri)?
        }
    };
    Ok(metadata)
}

pub fn get_metadata_type(uri: &str) -> MetadataType {
    if uri.starts_with("ipfs://") {
        MetadataType::Ipfs(uri.to_string())
    } else if uri.starts_with("http://") || uri.starts_with("https://") {
        MetadataType::Http(uri.to_string())
    } else {
        MetadataType::OnChain(uri.to_string())
    }
}

fn extract_string(value: &serde_json::Value, key: &str) -> Option<String> {
    value.get(key).and_then(|v| v.as_str()).map(String::from)
}

fn normalize_metadata(raw_metadata: &str) -> Result<NormalizedMetadata> {
    // Attempt to parse directly into NormalizedMetadata
    if let Ok(metadata) = serde_json::from_str::<NormalizedMetadata>(raw_metadata) {
        trace!("Successfully parsed metadata");
        return Ok(metadata);
    }

    // Fallback: Try parsing as a generic JSON Value for manual extraction
    let value = serde_json::from_str::<serde_json::Value>(raw_metadata).map_err(|e| {
        error!("Failed to parse metadata: {:?}", e);
        anyhow!("Failed to parse metadata: {}", e)
    })?;

    let image = extract_string(&value, "image");
    let name = extract_string(&value, "name");
    let description = extract_string(&value, "description");
    let external_url = extract_string(&value, "external_url");

    Ok(NormalizedMetadata {
        image,
        name,
        description,
        external_url,
        ..Default::default()
    })
}

async fn fetch_metadata(
    uri: &str,
    client: &Client,
    request_timeout_duration: Duration,
    referrer: &str,
) -> Result<TokenMetadata> {
    let request = client
        .get(uri)
        .header("User-Agent", "Mozilla/5.0 (compatible; YourClient/1.0)")
        .header("Referrer", referrer)
        .timeout(request_timeout_duration);

    let response = request.send().await;

    match response {
        Ok(response) => {
            debug!("Response status: {}", response.status());
            if response.status().is_success() {
                let raw_metadata = response.text().await?;
                let metadata = match normalize_metadata(raw_metadata.as_str()) {
                    Ok(metadata) => metadata,
                    Err(_) => NormalizedMetadata::default(),
                };

                let now = Utc::now();

                Ok(TokenMetadata {
                    raw: raw_metadata,
                    normalized: metadata,
                    metadata_updated_at: Some(now.timestamp()),
                })
            } else {
                error!("Request Failed. URI: {}", uri);
                Err(anyhow!("Request Failed"))
            }
        }
        Err(e) => {
            error!("Request Failed: {:?}", e);
            Err(anyhow!("Request Failed. URI: {}", uri))
        }
    }
}

pub fn file_extension_from_mime_type(mime_type: &str) -> &str {
    match mime_type {
        "model/gltf-binary" => "glb",
        "image/png" => "png",
        "image/jpeg" => "jpg",
        "image/gif" => "gif",
        "image/bmp" => "bmp",
        "image/webp" => "webp",
        "image/svg+xml" => "svg",
        "video/mp4" => "mp4",
        "video/quicktime" => "mov",
        "video/x-msvideo" => "avi",
        "video/x-matroska" => "mkv",
        "video/ogg" => "ogv",
        "video/webm" => "webm",
        _ => "",
    }
}

fn fetch_onchain_metadata(uri: &str) -> Result<TokenMetadata> {
    // Try to split from the comma as it is the standard with on chain metadata
    let url_encoded = urlencoding::decode(uri).map(|s| String::from(s.as_ref()));
    let uri_string = match url_encoded {
        Ok(encoded) => encoded,
        Err(_) => String::from(uri),
    };

    let now = Utc::now();
    match uri_string.split_once(',') {
        Some(("data:application/json;base64", uri)) => {
            // If it is base64 encoded, decode it, parse and return
            let decoded = general_purpose::STANDARD.decode(uri)?;
            let raw_metadata = std::str::from_utf8(&decoded)?;
            match serde_json::from_str::<NormalizedMetadata>(raw_metadata) {
                Ok(normalized_metadata) => Ok(TokenMetadata {
                    raw: raw_metadata.to_string(),
                    normalized: normalized_metadata,
                    metadata_updated_at: Some(now.timestamp()),
                }),
                Err(_) => {
                    let metadata = serde_json::from_str::<serde_json::Value>(raw_metadata)?;
                    let normalized_metadata = NormalizedMetadata {
                        name: extract_string(&metadata, "name"),
                        animation_key: extract_string(&metadata, "animation_key"),
                        image: extract_string(&metadata, "image"),
                        animation_mime_type: extract_string(&metadata, "animation_mime_type"),
                        animation_url: extract_string(&metadata, "animation_url"),
                        background_color: extract_string(&metadata, "background_color"),
                        description: extract_string(&metadata, "description"),
                        external_url: extract_string(&metadata, "external_url"),
                        image_mime_type: extract_string(&metadata, "image_mime_type"),
                        image_data: extract_string(&metadata, "image_data"),
                        image_key: extract_string(&metadata, "image_key"),
                        youtube_url: extract_string(&metadata, "youtube_url"),
                        ..Default::default()
                    };

                    Ok(TokenMetadata {
                        raw: raw_metadata.to_string(),
                        normalized: normalized_metadata,
                        metadata_updated_at: Some(now.timestamp()),
                    })
                }
            }
        }
        Some(("data:application/json", uri)) => {
            match serde_json::from_str::<NormalizedMetadata>(uri) {
                Ok(normalized_metadata) => Ok(TokenMetadata {
                    raw: uri.to_string(),
                    normalized: normalized_metadata,
                    metadata_updated_at: Some(now.timestamp()),
                }),
                Err(_) => {
                    let metadata = serde_json::from_str::<serde_json::Value>(uri)?;
                    let normalized_metadata = NormalizedMetadata {
                        name: extract_string(&metadata, "name"),
                        animation_key: extract_string(&metadata, "animation_key"),
                        image: extract_string(&metadata, "image"),
                        animation_mime_type: extract_string(&metadata, "animation_mime_type"),
                        animation_url: extract_string(&metadata, "animation_url"),
                        background_color: extract_string(&metadata, "background_color"),
                        description: extract_string(&metadata, "description"),
                        external_url: extract_string(&metadata, "external_url"),
                        image_mime_type: extract_string(&metadata, "image_mime_type"),
                        image_data: extract_string(&metadata, "image_data"),
                        image_key: extract_string(&metadata, "image_key"),
                        youtube_url: extract_string(&metadata, "youtube_url"),
                        ..Default::default()
                    };

                    Ok(TokenMetadata {
                        raw: uri.to_string(),
                        normalized: normalized_metadata,
                        metadata_updated_at: Some(now.timestamp()),
                    })
                }
            }
        }
        Some(("data:application/json;utf8", uri)) => {
            match serde_json::from_str::<NormalizedMetadata>(uri) {
                Ok(normalized_metadata) => Ok(TokenMetadata {
                    raw: uri.to_string(),
                    normalized: normalized_metadata,
                    metadata_updated_at: Some(now.timestamp()),
                }),
                Err(_) => {
                    let metadata = serde_json::from_str::<serde_json::Value>(uri)?;
                    let normalized_metadata = NormalizedMetadata {
                        name: extract_string(&metadata, "name"),
                        animation_key: extract_string(&metadata, "animation_key"),
                        image: extract_string(&metadata, "image"),
                        animation_mime_type: extract_string(&metadata, "animation_mime_type"),
                        animation_url: extract_string(&metadata, "animation_url"),
                        background_color: extract_string(&metadata, "background_color"),
                        description: extract_string(&metadata, "description"),
                        external_url: extract_string(&metadata, "external_url"),
                        image_mime_type: extract_string(&metadata, "image_mime_type"),
                        image_data: extract_string(&metadata, "image_data"),
                        image_key: extract_string(&metadata, "image_key"),
                        youtube_url: extract_string(&metadata, "youtube_url"),
                        ..Default::default()
                    };

                    Ok(TokenMetadata {
                        raw: uri.to_string(),
                        normalized: normalized_metadata,
                        metadata_updated_at: Some(now.timestamp()),
                    })
                }
            }
        }
        _ => match serde_json::from_str(uri) {
            // If it is only the URI without the data format information, try to format it
            // and if it fails, return empty metadata
            Ok(v) => Ok(v),
            Err(_) => Ok(TokenMetadata::default()),
        },
    }
}

pub fn extract_metadata_from_headers(headers: &HeaderMap) -> Result<(String, Option<u64>)> {
    debug!("Extracting metadata from headers...");

    let content_type = headers
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| {
            error!("Failed to extract content type.");
            anyhow!("Failed to extract content type")
        })?;

    let content_length = headers
        .get(CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok());

    debug!(
        "Successfully extracted content type: {} and content length: {:?}",
        content_type, content_length
    );
    Ok((content_type.to_string(), content_length))
}

#[cfg(test)]
mod tests {

    use super::*;
    use base64::engine::general_purpose::STANDARD;
    use reqwest::header::{HeaderMap, HeaderValue, CONTENT_LENGTH, CONTENT_TYPE};
    use serde_json::json;

    #[test]
    fn normalize_metadata_with_array_value() {
        let raw_metadata = r#"{
            "id":"0x4b2260c9e06f14a11dc99f69eab0596f3858193d4a4ca34c800000000000000",
            "name":"FirefighterDuck",
            "description":"So much water pressure in my mouth I could extinguish the sun",
            "version":1,
            "regionSize":100000,
            "image":"https://api.briq.construction/v1/preview/starknet-mainnet/0x4b2260c9e06f14a11dc99f69eab0596f3858193d4a4ca34c800000000000000.png",
            "animation_url":"https://api.briq.construction/v1/model/starknet-mainnet/0x4b2260c9e06f14a11dc99f69eab0596f3858193d4a4ca34c800000000000000.glb",
            "external_url":"https://briq.construction/set/starknet-mainnet/0x4b2260c9e06f14a11dc99f69eab0596f3858193d4a4ca34c800000000000000",
            "background_color":"65529c",
            "created_at":1676104065.0,
            "attributes":[
                {
                    "trait_type":"Number of briqs",
                    "value":116
                },
                {"display_type":"date","trait_type":"Creation Date","value":"2023-02-11"},
                {"trait_type":"Collections","value":["Ducks Everywhere"]},
                {"trait_type":"Ducks Everywhere","value":true},
                {"trait_type":"Artist","value":"OutSmth"},
                {"trait_type":"Date","value":"2023-02-13"},
                {"trait_type":"Number of steps","value":17}
            ],
            "booklet_id":"ducks_everywhere/FirefighterDuck"
        }"#;

        let normalized_metadata =
            normalize_metadata(raw_metadata).expect("failed metadata parsing");

        assert_eq!(
            normalized_metadata.image,
            Some(
                "https://api.briq.construction/v1/preview/starknet-mainnet/0x4b2260c9e06f14a11dc99f69eab0596f3858193d4a4ca34c800000000000000.png".to_string()
            )
        );
    }

    #[test]
    fn test_file_extension_from_mime_type() {
        assert_eq!(file_extension_from_mime_type("image/png"), "png");
        assert_eq!(file_extension_from_mime_type("image/jpeg"), "jpg");
        assert_eq!(file_extension_from_mime_type("video/mp4"), "mp4");
    }

    #[tokio::test]
    async fn test_determining_metadata_type() {
        let metadata_type =
            get_metadata_type("ipfs://QmZkPTq6AGnsoCkYiDPCFMaAjHpZAfHipyJeAdwtJh1fP5");
        assert!(
            metadata_type
                == MetadataType::Ipfs(
                    "ipfs://QmZkPTq6AGnsoCkYiDPCFMaAjHpZAfHipyJeAdwtJh1fP5".to_string()
                )
        );

        let metadata_type = get_metadata_type("https://everai.xyz/metadata/1");
        assert!(metadata_type == MetadataType::Http("https://everai.xyz/metadata/1".to_string()));
    }

    #[test]
    fn test_extract_valid_headers() {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("text/plain"));
        headers.insert(CONTENT_LENGTH, HeaderValue::from_static("42"));

        let metadata = extract_metadata_from_headers(&headers).unwrap();
        assert_eq!(metadata, ("text/plain".to_string(), Some(42)));
    }

    #[test]
    fn test_extract_missing_content_type() {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_LENGTH, HeaderValue::from_static("42"));

        let result = extract_metadata_from_headers(&headers);
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err().to_string(),
            "Failed to extract content type"
        );
    }

    #[test]
    fn test_extract_missing_content_length() {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("text/plain"));

        let result = extract_metadata_from_headers(&headers);
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err().to_string(),
            "Failed to extract or parse content length"
        );
    }

    #[test]
    fn test_extract_invalid_content_length_format() {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("text/plain"));
        headers.insert(CONTENT_LENGTH, HeaderValue::from_static("invalid"));

        let result = extract_metadata_from_headers(&headers);
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err().to_string(),
            "Failed to extract or parse content length"
        );
    }

    #[tokio::test]
    async fn test_fetch_metadata() {
        let client = Client::new();
        let uri = "https://example.com";
        let request_referrer = "https://arkproject.dev";
        let request_timeout_duration = Duration::from_secs(10);

        let metadata =
            fetch_metadata(uri, &client, request_timeout_duration, request_referrer).await;
        assert!(metadata.is_ok());

        let uri = "invalid_uri";
        let metadata =
            fetch_metadata(uri, &client, request_timeout_duration, request_referrer).await;

        assert!(metadata.is_err());
    }

    fn base64_encode(input: &str) -> String {
        STANDARD.encode(input)
    }

    #[test]
    fn fetch_base64_encoded_onchain_metadata() {
        let metadata_json = json!({
            "name": "Test Token",
            "description": "A test token",
            "image": "https://example.com/image.png"
        })
        .to_string();
        let encoded_metadata = base64_encode(&metadata_json);
        let uri = format!("data:application/json;base64,{}", encoded_metadata);

        let fetched_metadata = fetch_onchain_metadata(&uri).unwrap();

        assert_eq!(fetched_metadata.raw, metadata_json);
        assert_eq!(
            fetched_metadata.normalized.name,
            Some("Test Token".to_string())
        );
        assert!(fetched_metadata.metadata_updated_at.is_some());
    }

    #[test]
    fn fetch_direct_json_onchain_metadata() {
        let metadata_json = json!({
            "name": "Direct Test Token",
            "description": "A directly provided test token",
            "image": "https://example.com/direct_image.png"
        })
        .to_string();
        let uri = format!("data:application/json,{}", metadata_json);

        let fetched_metadata = fetch_onchain_metadata(&uri).unwrap();

        assert_eq!(fetched_metadata.raw, metadata_json);
        assert_eq!(
            fetched_metadata.normalized.name,
            Some("Direct Test Token".to_string())
        );
        assert!(fetched_metadata.metadata_updated_at.is_some());
    }

    #[test]
    fn handle_invalid_onchain_metadata_format() {
        let invalid_uri = "data:application/json;utf8,invalid_json";

        let result = fetch_onchain_metadata(invalid_uri);

        assert!(result.is_err() || result.unwrap().normalized.name.is_none());
    }
}
