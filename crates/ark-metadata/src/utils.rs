use anyhow::{anyhow, Result};
use log::debug;
use reqwest::header::{HeaderMap, CONTENT_LENGTH, CONTENT_TYPE};

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
