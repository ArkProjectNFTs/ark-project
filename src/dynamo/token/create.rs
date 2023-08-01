use crate::dynamo::token::utils::{convert_transfer_to_map, Transfer, TransferType};
use crate::services::metadata::get::NormalizedMetadata;
use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Error;
use dotenv::dotenv;
use log::info;
use std::collections::HashMap;
use std::env;

pub struct CreateTokenData {
    pub address: String,
    pub padded_token_id: String,
    pub from_address: String,
    pub to_address: String,
    pub timestamp: u64,
    pub token_uri: String,
    pub raw_metadata: String,
    pub normalized_metadata: NormalizedMetadata,
    pub owner: String,
    pub mint_transaction_hash: String,
    pub block_number_minted: u64,
}

pub async fn create_token(
    dynamo_client: &aws_sdk_dynamodb::Client,
    token_data: CreateTokenData,
) -> Result<Option<String>, Error> {
    dotenv().ok();
    let token_table = env::var("ARK_TOKENS_TABLE_NAME").expect("ARK_TOKENS_TABLE_NAME must be set");
    let image_uri = token_data.normalized_metadata.image.clone();
    let current_transfer = Transfer {
        from: token_data.from_address,
        to: token_data.to_address,
        kind: TransferType::Out,
        timestamp: token_data.timestamp.to_string(),
        transaction_hash: token_data.mint_transaction_hash.to_string(),
    };

    // attributes values
    let address_av = AttributeValue::S(token_data.address);
    let token_id_av = AttributeValue::S(token_data.padded_token_id);
    let token_uri_av = AttributeValue::S(token_data.token_uri);
    let raw_metadata_av = AttributeValue::S(token_data.raw_metadata.to_string());
    let normalized_metadata_map: HashMap<String, AttributeValue> =
        token_data.normalized_metadata.into();
    let image_uri_av = AttributeValue::S(image_uri.to_string());
    let owner_av = AttributeValue::S(token_data.owner);
    let mint_transaction_hash_av = AttributeValue::S(token_data.mint_transaction_hash);
    let block_number_minted_av = AttributeValue::N(token_data.block_number_minted.to_string());
    let current_transfer_av = convert_transfer_to_map(&current_transfer);
    info!("current_transfer: {:?}", current_transfer);

    let transfers_av = AttributeValue::L(vec![current_transfer_av]);
    let request = dynamo_client
        .put_item()
        .table_name(&token_table)
        .item("address", address_av.clone())
        .item("token_id", token_id_av.clone())
        .item("token_uri", token_uri_av)
        .item("raw_metadata", raw_metadata_av)
        .item(
            "normalized_metadata",
            AttributeValue::M(normalized_metadata_map),
        )
        .item("image_uri", image_uri_av)
        .item("token_owner", owner_av)
        .item("mint_transaction_hash", mint_transaction_hash_av)
        .item("block_number_minted", block_number_minted_av)
        .item("transfers", transfers_av);
    request.send().await?;
    Ok(None)
}
