use aws_sdk_dynamodb::error::SdkError;
use aws_sdk_dynamodb::operation::put_item::{PutItemError, PutItemOutput};
use aws_sdk_dynamodb::types::AttributeValue;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::events::transfer_processor::NormalizedMetadata;

pub async fn add_token(
    client: &aws_sdk_dynamodb::Client,
    collection_address: String,
    token_id: String,
    token_uri: String,
    raw_metadata: String,
    normalized_metadata: NormalizedMetadata,
    owner: String,
    minter_owner: String,
    mint_transaction_hash: String,
    block_number_minted: u64,
) -> Result<PutItemOutput, SdkError<PutItemError>> {
    let image_uri = normalized_metadata.image.clone();
    let normalized_metadata_map: HashMap<String, AttributeValue> = normalized_metadata.into();

    // address: event.collection_addrxess,
    // token_id: event.token_id,
    // token_uri: initialMetadataUri,
    // raw_metadata: metadata.rawMetadata || {},
    // normalized_metadata: metadata.normalizedMetadata || {},
    // raw_image_uri: metadata.rawMetadata
    //   ? metadata.rawMetadata.image
    //   : undefined,
    // image_uri: "", // metadata.imageUri,
    // last_metadata_refresh: new Date().toISOString(),
    // owner: event.to_address,
    // minter_owner: event.to_address,
    // symbol: event.token_symbol || "",
    // name: event.token_name || "",
    // mint_transaction_hash: event.transaction_hash,
    // block_number_minted: event.block_number,

    let current_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Failed to get current timestamp")
        .as_secs();

    let result = client
        .put_item()
        .table_name("ark_mainnet_tokens")
        .item("address", AttributeValue::S(collection_address))
        .item("token_id", AttributeValue::S(token_id))
        .item("token_uri", AttributeValue::S(token_uri))
        .item("raw_metadata", AttributeValue::S(raw_metadata))
        .item(
            "normalized_metadata",
            AttributeValue::M(normalized_metadata_map),
        )
        .item("image_uri", AttributeValue::S(image_uri))
        .item(
            "last_metadata_refresh",
            AttributeValue::S(current_timestamp.to_string()),
        )
        .item("owner", AttributeValue::S(owner))
        .item("minter_owner", AttributeValue::S(minter_owner))
        .item(
            "mint_transaction_hash",
            AttributeValue::S(mint_transaction_hash),
        )
        .item(
            "block_number_minted",
            AttributeValue::N(block_number_minted.to_string()),
        )
        .send()
        .await;

    result
}
