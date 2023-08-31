use super::utils::sanitize_uri;
use ark_db::collection::get::get_collection;
use ark_db::collection::update::{increment_collection_token_count, update_collection_latest_mint};
use ark_db::token::create::{create_token, CreateTokenData};
use ark_db::token_event::create::{create_token_event, TokenEvent};
use ark_metadata::get::get_metadata;
use aws_sdk_dynamodb::Client as DynamoClient;
use log::{debug, error, info};
use reqwest::Client as ReqwestClient;
use serde_json::to_string;

pub struct TokenData {
    pub padded_token_id: String,
    pub token_uri: String,
    pub owner: String,
    pub token_type: String,
    pub collection_address: String,
}

pub struct TransactionData {
    pub timestamp: u64,
    pub block_number: u64,
    pub from_address: String,
    pub to_address: String,
    pub hash: String,
}

pub async fn process_mint_event(
    client: &ReqwestClient,
    dynamo_client: &DynamoClient,
    padded_token_id: &str,
    token_uri: &str,
    timestamp: u64,
    token_data: TokenData,
    transaction_data: TransactionData,
) -> Result<(), Box<dyn std::error::Error>> {
    let (metadata_uri, initial_metadata_uri) = sanitize_uri(token_uri).await;

    info!(
        "metadata_uri: {:?} - initial_metadata_uri: {:?} - token_uri: {:?}",
        metadata_uri, initial_metadata_uri, token_uri
    );

    let collection_result =
        get_collection(dynamo_client, token_data.collection_address.to_string()).await;
    info!(
        "collection_result: {:?} - with collection address: {:?}",
        collection_result, token_data.collection_address
    );

    match collection_result {
        Ok(Some(collection)) => {
            println!("collection: {:?}", collection);

            let _ = increment_collection_token_count(
                dynamo_client,
                token_data.collection_address.clone(),
                token_data.token_type.clone(),
            )
            .await;

            if let Some(latest_mint) = collection.get("latest_mint") {
                let latest_mint_str = latest_mint.as_s().unwrap();
                match latest_mint_str.parse::<u64>() {
                    Ok(latest_mint_value) => {
                        println!(
                            "Check latest mint: {:?} / {:?}",
                            latest_mint_value, timestamp
                        );

                        if latest_mint_value > timestamp {
                            let _ = update_collection_latest_mint(
                                dynamo_client,
                                latest_mint_value,
                                token_data.collection_address.to_string(),
                            )
                            .await;
                        }
                    }
                    Err(parse_err) => {
                        info!("Error parsing latest_mint: {}", parse_err);
                    }
                }
            } else {
                let _ = update_collection_latest_mint(
                    dynamo_client,
                    timestamp,
                    token_data.collection_address.to_string(),
                )
                .await;
            }
        }
        Ok(None) => {
            info!("No collection found at address");
        }
        Err(err) => {
            info!("Error getting collection: {}", err);
        }
    }

    if !metadata_uri.is_empty() && metadata_uri != "undefined" {
        let result =
            get_metadata(client, metadata_uri.as_str(), initial_metadata_uri.as_str()).await;

        let (normalized_metadata, raw_metadata_str) = match result {
            Ok((raw_metadata, normalized_metadata)) => {
                debug!(
                    "Raw metadata: {:?} - Normalized_metadata: {:?}",
                    raw_metadata, normalized_metadata
                );
                let raw_metadata_str = to_string(&raw_metadata).unwrap();
                (Some(normalized_metadata), Some(raw_metadata_str))
            }
            Err(e) => {
                error!("Error fetching metadata: {}", e);
                (None, None)
            }
        };

        create_token(
            dynamo_client,
            CreateTokenData {
                address: token_data.collection_address.to_string(),
                padded_token_id: padded_token_id.to_string(),
                from_address: transaction_data.from_address.clone(),
                to_address: transaction_data.to_address.clone(),
                timestamp,
                token_uri: token_uri.to_string(),
                raw_metadata: raw_metadata_str,
                normalized_metadata: normalized_metadata.clone(),
                owner: token_data.owner.to_string(),
                mint_transaction_hash: transaction_data.hash.clone(),
                block_number_minted: transaction_data.block_number,
            },
        )
        .await?;

        let (token_image, token_name) = match normalized_metadata {
            Some(metadata) => (Some(metadata.image), Some(metadata.name)),
            None => (None, None),
        };

        let token_event = TokenEvent {
            address: token_data.collection_address.to_string(),
            timestamp: transaction_data.timestamp,
            block_number: transaction_data.block_number,
            event_type: "mint".to_string(),
            from_address: transaction_data.from_address.clone(),
            padded_token_id: token_data.padded_token_id.clone(),
            token_uri: token_data.token_uri.clone(),
            to_address: transaction_data.to_address.clone(),
            transaction_hash: transaction_data.hash.clone(),
            token_type: token_data.token_type.clone(),
            token_image,
            token_name,
            ..Default::default()
        };

        //  TODO: Inserting into ark_mainnet_collection_activities
        create_token_event(dynamo_client, token_event).await?;
    }

    Ok(())
}
