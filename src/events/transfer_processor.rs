use crate::events::update_token_transfers::update_token_transfers;
use crate::starknet::{client::get_block_with_txs, utils::get_contract_property_string};
use aws_sdk_dynamodb::Client as DynamoClient;
use log::info;
use num_bigint::BigUint;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use starknet::core::types::EmittedEvent;
use std::collections::HashMap;
use std::error::Error;

#[derive(Debug, Serialize, Deserialize)]
struct Metadata {
    description: String,
    external_url: String,
    image: String,
    name: String,
    attributes: Option<Vec<HashMap<String, String>>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct NormalizedMetadata {
    description: String,
    #[serde(rename = "external_url")]
    initial_metadata_uri: String,
    image: String,
    name: String,
    attributes: Vec<HashMap<String, String>>,
}

// todo: move to utils
fn left_pad_hex_32(hex_string: String) -> String {
    let trimmed_string = hex_string.as_str().trim_start_matches("0x");
    let padded_string = format!("{:0>32}", trimmed_string);
    padded_string
}

// todo: move to utils
async fn get_token_uri(
    client: &Client,
    token_id_low: &str,
    token_id_high: &str,
    contract_address: &str,
    block_number: u64,
) -> String {
    let token_uri_cairo0 = get_contract_property_string(
        client,
        contract_address,
        "tokenURI",
        vec![token_id_low, token_id_high],
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
        vec![token_id_low, token_id_high],
        block_number,
    )
    .await;

    if token_uri != "undefined" && !token_uri.is_empty() {
        return token_uri;
    }

    String::from("undefined")
}

pub async fn process_transfers(
    client: &Client,
    dynamo_client: &DynamoClient,
    value: &str,
) -> Result<(), Box<dyn Error>> {
    // ark_mainnet_tokens
    // let data = str::from_utf8(&value.as_bytes())?;
    let event: EmittedEvent = serde_json::from_str(value)?;
    // info!("Transfer detected: {:?}", event);
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

    let low = u128::from_str_radix(&left_pad_hex_32(token_id_low), 16).unwrap();
    let high = u128::from_str_radix(&left_pad_hex_32(token_id_high), 16).unwrap();

    let low_bytes = low.to_be_bytes();
    let high_bytes = high.to_be_bytes();

    let mut bytes: Vec<u8> = Vec::new();
    bytes.extend(high_bytes);
    bytes.extend(low_bytes);

    let token_id_big_uint = BigUint::from_bytes_be(&bytes[..]);
    let token_id = token_id_big_uint.to_str_radix(10);

    // let contract_address = event.from_address.to_string();
    // let block_number = event.block_number;

    // let token_uri = get_token_uri(
    //     client,
    //     token_id_low,
    //     token_id_high,
    //     &contract_address,
    //     block_number,
    // )
    // .await;

    // let mint_object = serde_json::json!({
    //     "event_type": "mint",
    //     "transaction_hash": event.transaction_hash,
    //     "block_hash": event.block_hash,
    //     "from_address": from_address,
    //     "to_address": to_address,
    // "contract_type": contract_attributes.contract_type,
    // "collection_address": contract_address,
    // "token_id": token_id,
    // "token_uri": token_uri,
    // "block_number": block_number,
    // "token_name": contract_attributes.name.to_string(),
    // "token_symbol": contract_attributes.symbol.to_string(),
    //     "timestamp": timestamp.to_string()
    // });

    let transfer = update_token_transfers(
        dynamo_client,
        &contract_address,
        &token_id,
        &from_address,
        &to_address,
        &timestamp,
        &transaction_hash,
    )
    .await;
    // info!("Mint detected: {:?}", mint_object);

    // if from_address == "0x0" {
    //     process_mint_event(client, &token_uri, timestamp).await;
    // } else {
    //     // TODO
    // }

    Ok(())
}

// async fn process_mint_event(client: &Client, token_uri: &str, timestamp: u64) {
//     let (metadata_uri, initial_metadata_uri) = sanitize_uri(token_uri).await;
//     if !metadata_uri.is_empty() {
//         let metadata = fetch_metadata(client, &metadata_uri, &initial_metadata_uri)
//             .await
//             .unwrap();

//         // TODO: Uploading image to S3

//         // TODO: Inserting into ark_mainnet_tokens
//     }
// }

// async fn sanitize_uri(token_uri: &str) -> (String, String) {
//     let mut request_uri = token_uri
//         .trim()
//         .replace("\u{0003}", "")
//         .replace("-https://", "https://");
//     request_uri = convert_ipfs_uri_to_http_uri(request_uri);
//     (request_uri.clone(), request_uri)
// }

// fn convert_ipfs_uri_to_http_uri(request_uri: String) -> String {
//     let result = if request_uri.contains("ipfs://") {
//         format!(
//             "http://ec2-54-89-64-17.compute-1.amazonaws.com:8080/ipfs/{}",
//             request_uri.split("ipfs://").last().unwrap()
//         )
//     } else {
//         request_uri
//     };
//     result
// }
// async fn fetch_metadata(
//     client: &Client,
//     metadata_uri: &str,
//     initial_metadata_uri: &str,
// ) -> Result<NormalizedMetadata, Box<dyn std::error::Error>> {
//     let res = client.get(metadata_uri).send().await?;
//     let raw_metadata: Metadata = res.json().await?;

//     let mut normalized_attributes = vec![];

//     if let Some(attributes) = raw_metadata.attributes {
//         for attribute in attributes {
//             let mut new_attribute = HashMap::new();
//             new_attribute.insert("trait_type".into(), attribute["trait_type"].clone());
//             new_attribute.insert("value".into(), attribute["value"].clone());
//             new_attribute.insert("display_type".into(), attribute["display_type"].clone());
//             normalized_attributes.push(new_attribute);
//         }
//     }

//     Ok(NormalizedMetadata {
//         description: raw_metadata.description,
//         initial_metadata_uri: initial_metadata_uri.to_string(),
//         image: raw_metadata.image,
//         name: raw_metadata.name,
//         attributes: normalized_attributes,
//     })
// }
