use crate::dynamo::add_collection_activity;
use crate::dynamo::get_collection::get_collection;
use crate::dynamo::update_latest_mint::update_latest_mint;
use crate::events::transfer_processor::add_collection_activity::add_collection_activity;
use crate::events::update_token_transfers::update_token_transfers;
use crate::starknet::{client::get_block_with_txs, utils::get_contract_property_string};
use crate::utils::sanitize_uri;
use log::info;
use num_bigint::BigUint;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use starknet::core::types::EmittedEvent;
use std::error::Error;

#[derive(Debug, Serialize, Deserialize)]
struct Attribute {
    trait_type: String,
    value: String,
    display_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NormalizedMetadata {
    description: String,
    external_url: String,
    image: String,
    name: String,
    attributes: Vec<Attribute>,
}

async fn get_token_uri(
    client: &reqwest::Client,
    token_id_low: &str,
    token_id_high: &str,
    contract_address: &str,
    block_number: u64,
) -> String {
    let token_uri_cairo0 = get_contract_property_string(
        client,
        contract_address,
        "tokenURI",
        vec![&token_id_low, &token_id_high],
        block_number,
    )
    .await;

    if token_uri_cairo0 != "undefined" && !token_uri_cairo0.is_empty() {
        return token_uri_cairo0;
    }

    let token_uri = get_contract_property_string(
        client,
        contract_address,
        "token_uri",
        vec![&token_id_low, &token_id_high],
        block_number,
    )
    .await;

    if token_uri != "undefined" && !token_uri.is_empty() {
        return token_uri;
    }

    String::from("undefined")
}

pub async fn process_transfers(
    client: &reqwest::Client,
    dynamo_db_client: &aws_sdk_dynamodb::Client,
    value: &str,
) -> Result<(), Box<dyn Error>> {
    println!("Processing transfers: {:?}", value);

    //let data = str::from_utf8(&value.as_bytes())?;
    let event: EmittedEvent = serde_json::from_str(value)?;

    // Get block info
    let block = get_block_with_txs(client, event.block_number)
        .await
        .unwrap();
    let timestamp = block.get("timestamp").unwrap().as_u64().unwrap();

    // Extracting "data" from event
    let from_address = format!("{:#064x}", event.data[0]);
    let to_address = format!("{:#064x}", event.data[1]);
    let contract_address = format!("{:#064x}", event.from_address);
    let transaction_hash = format!("{:#064x}", event.transaction_hash);
    let token_id_low = format!("{:#064x}", event.data[2]);
    let token_id_high = format!("{:#064x}", event.data[3]);

    let data_strings: Vec<String> = event
        .data
        .iter()
        .map(|field_element| field_element.to_string())
        .collect();

    let from_address = data_strings[0].as_str();
    let to_address = data_strings[1].as_str();

    let token_id_low = &data_strings[2].as_str();
    let token_id_high = &data_strings[3].as_str();

    let low = u128::from_str_radix(data_strings[2].as_str(), 10).unwrap();
    let high = u128::from_str_radix(data_strings[3].as_str(), 10).unwrap();

    let low_bytes = low.to_be_bytes();
    let high_bytes = high.to_be_bytes();

    let mut bytes: Vec<u8> = Vec::new();
    bytes.extend(high_bytes);
    bytes.extend(low_bytes);

    let token_id_big_uint = BigUint::from_bytes_be(&bytes[..]);
    let token_id = token_id_big_uint.to_str_radix(10);
    let contract_address = serde_json::to_string(&event.from_address).unwrap();
    let block_number = event.block_number;

    let token_uri = get_token_uri(
        client,
        token_id_low,
        token_id_high,
        &contract_address,
        block_number,
    )
    .await;

    info!(
        "Contract address: {} - Token ID: {} - Token URI: {} - Block number: {}",
        contract_address, token_id, token_uri, block_number
    );

    let transfer = update_token_transfers(
        dynamo_db_client,
        &contract_address,
        &token_id,
        &from_address,
        &to_address,
        &timestamp,
        &transaction_hash,
    )
    .await;

    if from_address == "0" {
        info!(
        "\n\n=== MINT DETECTED ===\n\nContract address: {} - Token ID: {} - Token URI: {} - Block number: {}\n\n===========\n\n",
        contract_address, token_id, token_uri, block_number
    );

        process_mint_event(
            client,
            dynamo_db_client,
            token_uri.as_str(),
            timestamp,
            contract_address.as_str(),
        )
        .await;
    } else {
        // TODO
    }

    Ok(())
}

async fn process_mint_event(
    client: &reqwest::Client,
    dynamo_client: &aws_sdk_dynamodb::Client,
    token_uri: &str,
    timestamp: u64,
    collection_address: &str,
) {
    println!("token_uri: {:?}", token_uri);

    let (metadata_uri, initial_metadata_uri) = sanitize_uri(token_uri).await;
    let collection_result = get_collection(dynamo_client, collection_address).await;

    match collection_result {
        Ok(Some(collection)) => {
            if let Some(latest_mint) = collection.get("latest_mint") {
                let latest_mint_str = latest_mint.as_s().unwrap();
                match latest_mint_str.parse::<u64>() {
                    Ok(latest_mint_value) => {
                        if latest_mint_value > timestamp {
                            let _ = update_latest_mint(
                                dynamo_client,
                                latest_mint_value,
                                collection_address.to_string(),
                            )
                            .await;
                        }

                        //  TODO: Inserting into ark_mainnet_collection_activities

                        let _ = add_collection_activity(dynamo_client).await;
                    }
                    Err(parse_err) => {
                        info!("Error parsing latest_mint: {}", parse_err);
                    }
                }
            } else {
                info!("No latest_mint in the collection");
            }
        }
        Ok(None) => {
            info!("No collection found at address");
        }
        Err(err) => {
            info!("Error getting collection: {}", err);
        }
    }

    println!("metadata_uri: {:?}", metadata_uri);

    if !metadata_uri.is_empty() {
        let result = fetch_metadata(
            client,
            &metadata_uri.as_str(),
            &initial_metadata_uri.as_str(),
        )
        .await;

        match result {
            Ok((raw_metadata, normalized_metadata)) => {
                println!("Raw metadata: {:?}", raw_metadata);

                // TODO: Uploading image to S3

                // TODO: Inserting into ark_mainnet_tokens

                // let _ = add_token(
                //     dynamo_client,
                //     collection_address.to_string(),
                //     "".to_string(),
                //     "".to_string(),
                // )
                // .await;
            }
            Err(e) => {
                info!("Error fetching metadata: {}", e);
                return;
            }
        };
    }
}

pub async fn fetch_metadata(
    client: &reqwest::Client,
    metadata_uri: &str,
    initial_metadata_uri: &str,
) -> Result<(Value, NormalizedMetadata), Box<dyn Error>> {
    println!("Fetching metadata: {}", metadata_uri);

    let response = client.get(metadata_uri).send().await?;
    let raw_metadata: Value = response.json().await?;

    println!("Metadata: {:?}", raw_metadata);

    let empty_vec = Vec::new();

    let attributes = raw_metadata
        .get("attributes")
        .and_then(|attr| attr.as_array())
        .unwrap_or(&empty_vec);

    let normalized_attributes: Vec<Attribute> = attributes
        .iter()
        .map(|attribute| Attribute {
            trait_type: attribute
                .get("trait_type")
                .and_then(|trait_type| trait_type.as_str())
                .unwrap_or("")
                .to_string(),
            value: attribute
                .get("value")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string(),
            display_type: attribute
                .get("display_type")
                .and_then(|display_type| display_type.as_str())
                .unwrap_or("")
                .to_string(),
        })
        .collect();

    let normalized_metadata = NormalizedMetadata {
        description: raw_metadata
            .get("description")
            .and_then(|desc| desc.as_str())
            .unwrap_or("")
            .to_string(),
        external_url: initial_metadata_uri.to_string(),
        image: raw_metadata
            .get("image")
            .and_then(|img| img.as_str())
            .unwrap_or("")
            .to_string(),
        name: raw_metadata
            .get("name")
            .and_then(|name| name.as_str())
            .unwrap_or("")
            .to_string(),
        attributes: normalized_attributes,
    };

    Ok((raw_metadata, normalized_metadata))
}
