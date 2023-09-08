// use serde_json::Value;
// use starknet::core::utils::starknet_keccak;

use std::env;

use log::info;

#[allow(dead_code)]
pub async fn upload_image_to_s3(_url: &str) -> Result<String, Box<dyn std::error::Error>> {
    //     let client = reqwest::Client::new();
    //     let res = client.get(url).send().await?;

    //     let extension = url.split('.').last().unwrap_or_default();
    //     let key = format!("{}.{}", Uuid::new_v4(), extension);

    //     let s3_client = S3Client::new(Region::UsEast1);
    //     let put_request = PutObjectRequest {
    //         bucket: "ark-nft-images".to_string(),
    //         key,
    //         body: Some(ByteStream::new(res.bytes_stream())),
    //         content_type: Some(
    //             res.headers()
    //                 .get("content-type")
    //                 .unwrap()
    //                 .to_str()
    //                 .unwrap()
    //                 .into(),
    //         ),
    //         ..Default::default()
    //     };

    //     let s3_res = s3_client.put_object(put_request).await?;
    //     Ok(s3_res.key.unwrap())

    Ok("".to_string())
}

pub fn get_ecs_task_id() -> String {
    let container_metadata_uri = env::var("ECS_CONTAINER_METADATA_URI").unwrap_or("".to_string());

    let pattern = regex::Regex::new(r"/v3/([a-f0-9]{32})-").unwrap();
    let task_id = pattern
        .captures(container_metadata_uri.as_str())
        .and_then(|cap| cap.get(1).map(|m| m.as_str()))
        .unwrap_or("");

    info!("ECS task ID: {:?}", task_id);
    task_id.to_string()
}
