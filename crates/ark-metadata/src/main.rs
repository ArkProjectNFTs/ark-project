use anyhow::Result;
use reqwest::Client;

struct MetadataImage {
    file_type: String,
    content_length: u64,
}

async fn fetch_token_image(url: &str, cache_image: bool) -> Result<MetadataImage> {
    if !cache_image {
        let response = Client::new().head(url).send().await?;

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

#[tokio::main]
async fn main() -> Result<()> {
    let value = fetch_token_image("https://unframed.co/_next/image?url=https%3A%2F%2Fstatic.argent.net%2Fmoments%2Fimages%2F3a59cd48-c085-43a5-a6c4-5682f179596c.png&w=750&q=75", false).await;

    match value {
        Ok(value) => println!("value: {} type:{}", value.content_length, value.file_type),
        Err(err) => println!("err: {:?}", err),
    }

    Ok(())
}
