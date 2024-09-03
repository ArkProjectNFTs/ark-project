use crate::types::{
    DisplayType, MetadataAttribute, MetadataTraitValue, MetadataType, NormalizedMetadata,
    TokenMetadata,
};
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose, Engine as _};
use chrono::Utc;
use reqwest::header::{HeaderMap, CONTENT_LENGTH, CONTENT_TYPE};
use reqwest::Client;
use serde_json::{Number, Value};
use std::str::FromStr;
use std::time::Duration;
use tracing::{debug, error, trace, warn};

pub async fn get_token_metadata(
    client: &Client,
    uri: &str,
    ipfs_gateway_uri: &str,
    request_timeout_duration: Duration,
    request_referrer: &str,
) -> Result<TokenMetadata> {
    let parsed_uri = uri.replace("https://gateway.pinata.cloud/ipfs/", "ipfs://");
    let metadata_type = get_metadata_type(parsed_uri.as_str());
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
    let animation_url = extract_string(&value, "animation_url");

    Ok(NormalizedMetadata {
        image,
        name,
        description,
        external_url,
        animation_url,
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

pub fn file_extension_from_mime_type(mime_type: &str) -> Option<&str> {
    match mime_type {
        "model/gltf-binary" => Some("glb"),
        "image/png" => Some("png"),
        "image/jpeg" => Some("jpg"),
        "image/gif" => Some("gif"),
        "image/bmp" => Some("bmp"),
        "image/webp" => Some("webp"),
        "image/svg+xml" => Some("svg"),
        "video/mp4" => Some("mp4"),
        "video/quicktime" => Some("mov"),
        "video/x-msvideo" => Some("avi"),
        "video/x-matroska" => Some("mkv"),
        "video/ogg" => Some("ogv"),
        "video/webm" => Some("webm"),
        _ => {
            warn!("Unknown MIME type: {}", mime_type);
            None
        }
    }
}

pub fn get_content_type_from_extension(extension: &str) -> &str {
    match extension {
        "glb" => "text/html",
        "png" => "image/png",
        "jpg" => "image/jpeg",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "mp4" => "video/mp4",
        "mov" => "video/quicktime",
        "avi" => "video/x-msvideo",
        "mkv" => "video/x-matroska",
        "ogv" => "video/ogg",
        "webm" => "video/webm",
        _ => "application/octet-stream",
    }
}

fn fetch_onchain_metadata(uri: &str) -> Result<TokenMetadata> {
    let uri_string = urlencoding::decode(uri)
        .map(|s| s.into_owned())
        .unwrap_or_else(|_| uri.to_string());

    let now = Utc::now().timestamp();

    let (prefix, content) = uri_string.split_once(',').unwrap_or(("", &uri_string));

    let json_value: Value = match prefix {
        "data:application/json;base64" => {
            let decoded = general_purpose::STANDARD.decode(content)?;
            let raw_metadata = std::str::from_utf8(&decoded)?;
            serde_json::from_str(raw_metadata)?
        }
        "data:application/json" | "data:application/json;utf8" => serde_json::from_str(content)?,
        _ => serde_json::from_str(&uri_string).unwrap_or(Value::Null),
    };

    let mut normalized_metadata = NormalizedMetadata {
        name: json_value
            .get("name")
            .and_then(|v| v.as_str())
            .map(String::from),
        image: json_value
            .get("image")
            .and_then(|v| v.as_str())
            .map(String::from)
            .map(|image| image.replace("https://gateway.pinata.cloud/ipfs/", "ipfs://")),
        description: json_value
            .get("description")
            .and_then(|v| v.as_str())
            .map(String::from),
        external_url: json_value
            .get("external_url")
            .and_then(|v| v.as_str())
            .map(String::from),
        background_color: json_value
            .get("background_color")
            .and_then(|v| v.as_str())
            .map(String::from),
        animation_url: json_value
            .get("animation_url")
            .and_then(|v| v.as_str())
            .map(String::from),
        youtube_url: json_value
            .get("youtube_url")
            .and_then(|v| v.as_str())
            .map(String::from),
        ..Default::default()
    };

    if let Some(attributes) = json_value.get("attributes").and_then(|v| v.as_array()) {
        normalized_metadata.attributes = Some(
            attributes
                .iter()
                .filter_map(|attr| {
                    if let (Some(trait_type), Some(value)) = (
                        attr.get("trait_type")
                            .or_else(|| attr.get("trait"))
                            .and_then(|v| v.as_str())
                            .map(String::from),
                        attr.get("value").map(|v| match v {
                            value if value.is_number() => MetadataTraitValue::Number(Number::from(
                                value.as_i64().unwrap_or_default(),
                            )),
                            value => MetadataTraitValue::String(
                                value.as_str().unwrap_or_default().to_string(),
                            ),
                        }),
                    ) {
                        let display_type = attr
                            .get("display_type")
                            .and_then(|v| v.as_str())
                            .and_then(|s| DisplayType::from_str(s).ok());

                        Some(MetadataAttribute {
                            display_type,
                            trait_type: Some(trait_type),
                            value,
                        })
                    } else if let (Some(trait_type), Some(value)) = (
                        attr.get("trait").and_then(|v| v.as_str()).map(String::from),
                        attr.get("value")
                            .map(|v| MetadataTraitValue::String(v.as_str().unwrap().to_string())),
                    ) {
                        Some(MetadataAttribute {
                            display_type: None,
                            trait_type: Some(trait_type),
                            value,
                        })
                    } else {
                        None
                    }
                })
                .collect(),
        );
    } else if let Some(attributes) = json_value.get("attributes") {
        normalized_metadata.attributes = serde_json::from_value(attributes.clone()).ok();
    }

    // TODO: manage properties

    Ok(TokenMetadata {
        raw: json_value.to_string(),
        normalized: normalized_metadata,
        metadata_updated_at: Some(now),
    })
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

    let content_length = match headers.get(CONTENT_LENGTH) {
        Some(value) => {
            let value_str = value.to_str().map_err(|_| {
                error!("Failed to parse content length.");
                anyhow!("Failed to extract or parse content length")
            })?;
            Some(value_str.parse::<u64>().map_err(|_| {
                error!("Invalid content length format.");
                anyhow!("Failed to extract or parse content length")
            })?)
        }
        None => None,
    };

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
        assert_eq!(file_extension_from_mime_type("image/png"), Some("png"));
        assert_eq!(file_extension_from_mime_type("image/jpeg"), Some("jpg"));
        assert_eq!(file_extension_from_mime_type("video/mp4"), Some("mp4"));
        assert_eq!(
            file_extension_from_mime_type("model/gltf-binary"),
            Some("glb")
        );
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
