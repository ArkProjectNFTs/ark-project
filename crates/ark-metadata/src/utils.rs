pub fn convert_ipfs_uri_to_http_uri(request_uri: String) -> String {
    if request_uri.contains("ipfs://") {
        format!(
            "http://ec2-54-89-64-17.compute-1.amazonaws.com:8080/ipfs/{}",
            request_uri.split("ipfs://").last().unwrap()
        )
    } else {
        request_uri
    }
}

pub async fn sanitize_uri(token_uri: &str) -> (String, String) {
    let mut request_uri = token_uri
        .trim()
        .replace('\u{0003}', "")
        .replace("/0", "")
        .replace('\u{2}', "")
        .replace("-https://", "https://");
    request_uri = convert_ipfs_uri_to_http_uri(request_uri);
    (request_uri.clone(), request_uri)
}
