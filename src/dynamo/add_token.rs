use aws_sdk_dynamodb::error::SdkError;
use aws_sdk_dynamodb::operation::update_item::UpdateItemError;
use aws_sdk_dynamodb::operation::update_item::UpdateItemOutput;
use aws_sdk_dynamodb::types::AttributeValue;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::events::transfer_processor::NormalizedMetadata;

pub async fn update_token(
    client: &aws_sdk_dynamodb::Client,
    collection_address: String,
    token_id: String,
    token_uri: String,
    raw_metadata: String,
    normalized_metadata: NormalizedMetadata,
    owner: String,
    mint_transaction_hash: String,
    block_number_minted: u64,
) -> Result<UpdateItemOutput, SdkError<UpdateItemError>> {
    let image_uri = normalized_metadata.image.clone();
    let normalized_metadata_map: HashMap<String, AttributeValue> = normalized_metadata.into();

    let current_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Failed to get current timestamp")
        .as_secs();

    let result = client
        .update_item()
        .table_name("ark_mainnet_tokens")
        .key("address", AttributeValue::S(collection_address))
        .key("token_id", AttributeValue::S(token_id))
        .update_expression(
            "SET last_metadata_refresh = :last_metadata_refresh, token_uri = :token_uri, raw_metadata = :raw_metadata, normalized_metadata = :normalized_metadata, image_uri = :image_uri, token_owner = :token_owner, mint_transaction_hash = :mint_transaction_hash, block_number_minted = :block_number_minted",
        )
        .expression_attribute_values(
            ":last_metadata_refresh",
            AttributeValue::S(current_timestamp.to_string()),
        )
        .expression_attribute_values(
            ":raw_metadata",
            AttributeValue::S(raw_metadata.to_string()),
        )
        .expression_attribute_values(
            ":image_uri",
            AttributeValue::S(image_uri.to_string()),
        )
        .expression_attribute_values(
            ":normalized_metadata",
            AttributeValue::M(normalized_metadata_map)
        )
        .expression_attribute_values(
            ":token_owner",
            AttributeValue::S(owner)
        )
        .expression_attribute_values(
            ":mint_transaction_hash",
            AttributeValue::S(mint_transaction_hash)
        )
        .expression_attribute_values(
            ":block_number_minted",
            AttributeValue::N(block_number_minted.to_string()),
        )
        .expression_attribute_values(":token_uri", AttributeValue::S(token_uri.to_string()))
        .send()
        .await;

    println!("update_token: {:?}", result);

    result
}
