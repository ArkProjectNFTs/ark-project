use aws_sdk_dynamodb::error::SdkError;
use aws_sdk_dynamodb::operation::update_item::UpdateItemError;
use aws_sdk_dynamodb::operation::update_item::UpdateItemOutput;
use aws_sdk_dynamodb::types::AttributeValue;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::events::transfer_processor::NormalizedMetadata;

pub struct UpdateTokenData {
    pub collection_address: String,
    pub token_id: String,
    pub token_uri: String,
    pub owner: String,
    pub mint_transaction_hash: String,
    pub block_number_minted: u64,
    pub raw: String,
    pub normalized: NormalizedMetadata,
}

pub async fn update_token(
    client: &aws_sdk_dynamodb::Client,
    update_token_data: UpdateTokenData,
) -> Result<UpdateItemOutput, SdkError<UpdateItemError>> {
    let image_uri = update_token_data.normalized.image.clone();
    let normalized_metadata_map: HashMap<String, AttributeValue> =
        update_token_data.normalized.into();

    let current_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Failed to get current timestamp")
        .as_secs();

    let padded_token_id = format!("{:0>width$}", update_token_data.token_id, width = 78);

    let result = client
        .update_item()
        .table_name("ark_mainnet_tokens")
        .key("address", AttributeValue::S(update_token_data.collection_address))
        .key("token_id", AttributeValue::S(padded_token_id))
        .update_expression(
            "SET last_metadata_refresh = :last_metadata_refresh, token_uri = :token_uri, raw_metadata = :raw_metadata, normalized_metadata = :normalized_metadata, image_uri = :image_uri, token_owner = :token_owner, mint_transaction_hash = :mint_transaction_hash, block_number_minted = :block_number_minted",
        )
        .expression_attribute_values(
            ":last_metadata_refresh",
            AttributeValue::S(current_timestamp.to_string()),
        )
        .expression_attribute_values(
            ":raw_metadata",
            AttributeValue::S(update_token_data.raw.to_string()),
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
            AttributeValue::S(update_token_data.owner)
        )
        .expression_attribute_values(
            ":mint_transaction_hash",
            AttributeValue::S(update_token_data.mint_transaction_hash)
        )
        .expression_attribute_values(
            ":block_number_minted",
            AttributeValue::N(update_token_data.block_number_minted.to_string()),
        )
        .expression_attribute_values(":token_uri", AttributeValue::S(update_token_data.token_uri.to_string()))
        .send()
        .await;

    println!("update_token: {:?}", result);

    result
}
