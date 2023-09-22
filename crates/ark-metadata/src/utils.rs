use crate::types::{MetadataType, TokenMetadata};
use anyhow::{anyhow, Result};
use base64::{engine::general_purpose, Engine as _};
use log::debug;
use reqwest::header::{HeaderMap, CONTENT_LENGTH, CONTENT_TYPE};
use reqwest::Client;
use std::{env, time::Duration};

pub async fn get_token_metadata(client: &Client, uri: &str) -> Result<TokenMetadata> {
    let metadata_type = get_metadata_type(uri);
    let metadata = match metadata_type {
        MetadataType::Ipfs(uri) => get_ipfs_metadata(&uri, client).await?,
        MetadataType::Http(uri) => get_http_metadata(&uri, client).await?,
        MetadataType::OnChain(uri) => get_onchain_metadata(&uri)?,
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

async fn get_ipfs_metadata(uri: &str, client: &Client) -> Result<TokenMetadata> {
    let mut ipfs_url = env::var("IPFS_GATEWAY_URI").expect("IPFS_GATEWAY_URI must be set");
    let ipfs_hash = uri.trim_start_matches("ipfs://");
    ipfs_url.push_str(ipfs_hash);
    let request = client.get(ipfs_url).timeout(Duration::from_secs(3));
    let response = request.send().await?;
    let metadata = response.json::<TokenMetadata>().await?;
    Ok(metadata)
}

async fn get_http_metadata(uri: &str, client: &Client) -> Result<TokenMetadata> {
    let resp = client.get(uri).send().await?;
    let metadata: TokenMetadata = resp.json().await?;
    Ok(metadata)
}

fn get_onchain_metadata(uri: &str) -> Result<TokenMetadata> {
    // Try to split from the comma as it is the standard with on chain metadata
    let url_encoded = urlencoding::decode(uri).map(|s| String::from(s.as_ref()));
    let uri_string = match url_encoded {
        Ok(encoded) => encoded,
        Err(_) => String::from(uri),
    };

    match uri_string.split_once(',') {
        Some(("data:application/json;base64", uri)) => {
            // If it is base64 encoded, decode it, parse and return
            let decoded = general_purpose::STANDARD.decode(uri)?;
            let decoded = std::str::from_utf8(&decoded)?;
            let metadata: TokenMetadata = serde_json::from_str(decoded)?;
            Ok(metadata)
        }
        Some(("data:application/json", uri)) => {
            // If it is plain json, parse it and return
            //println!("Handling {:?}", uri);
            let metadata: TokenMetadata = serde_json::from_str(uri)?;
            Ok(metadata)
        }
        _ => match serde_json::from_str(uri) {
            // If it is only the URI without the data format information, try to format it
            // and if it fails, return empty metadata
            Ok(v) => Ok(v),
            Err(_) => Ok(TokenMetadata::default()),
        },
    }
}

pub fn extract_metadata_from_headers(headers: &HeaderMap) -> Result<(String, u64)> {
    debug!("Extracting metadata from headers...");

    let content_type = headers
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| {
            debug!("Failed to extract content type.");
            anyhow!("Failed to extract content type")
        })?;

    let content_length = headers
        .get(CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .ok_or_else(|| {
            debug!("Failed to extract or parse content length.");
            anyhow!("Failed to extract or parse content length")
        })?;

    debug!(
        "Successfully extracted content type: {} and content length: {}",
        content_type, content_length
    );
    Ok((content_type.to_string(), content_length))
}

#[cfg(test)]
mod tests {
    use super::*;
    use reqwest::header::{HeaderMap, HeaderValue, CONTENT_LENGTH, CONTENT_TYPE};

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
        assert_eq!(metadata, ("text/plain".to_string(), 42));
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
}
