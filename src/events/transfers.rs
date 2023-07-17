use crate::starknet::{client::get_block_with_txs, utils::get_contract_property_string};
use log::info;
use num_bigint::BigUint;
use reqwest::Client;
use starknet::core::types::EmittedEvent;
use std::error::Error;

fn left_pad_hex_32(hex_string: String) -> String {
    let trimmed_string = hex_string.as_str().trim_start_matches("0x");
    let padded_string = format!("{:0>32}", trimmed_string);
    padded_string
}

async fn get_token_uri(
    client: &Client,
    token_id_low: &str,
    token_id_high: &str,
    contract_address: &str,
    block_number: u64,
) -> String {
    info!("get_token_id: [{:?}, {:?}]", token_id_low, token_id_high);

    let token_uri_cairo0 = get_contract_property_string(
        client,
        contract_address,
        "tokenURI",
        vec![token_id_low, token_id_high],
        block_number,
    )
    .await;

    info!("token_uri_cairo0: {:?}", token_uri_cairo0);

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

    info!("token_uri: {:?}", token_uri);

    if token_uri != "undefined" && !token_uri.is_empty() {
        return token_uri;
    }

    String::from("undefined")
}

pub async fn process_transfers(client: &Client, value: &str) -> Result<(), Box<dyn Error>> {
    println!("Processing transfers: {:?}", value);

    //let data = str::from_utf8(&value.as_bytes())?;
    let event: EmittedEvent = serde_json::from_str(value)?;

    // Get block info
    let block = get_block_with_txs(client, event.block_number)
        .await
        .unwrap();
    let timestamp = block.get("timestamp").unwrap().as_u64().unwrap();

    print!("timestamp: {:?}", timestamp);
    // Extracting "data" from event

    let data_strings: Vec<String> = event
        .data
        .iter()
        .map(|field_element| field_element.to_string())
        .collect();

    let from_address = data_strings[0].as_str();
    let to_address = data_strings[1].as_str();
    let token_id_low = &data_strings[2].as_str();
    let token_id_high = &data_strings[3].as_str();

    let low = u128::from_str_radix(&left_pad_hex_32(data_strings[2].clone()), 16).unwrap();
    let high = u128::from_str_radix(&left_pad_hex_32(data_strings[3].clone()), 16).unwrap();

    let low_bytes = low.to_be_bytes();
    let high_bytes = high.to_be_bytes();

    let mut bytes: Vec<u8> = Vec::new();
    bytes.extend(high_bytes);
    bytes.extend(low_bytes);

    let token_id_big_uint = BigUint::from_bytes_be(&bytes[..]);
    let token_id = token_id_big_uint.to_str_radix(10);

    let contract_address = event.from_address.to_string().as_str();
    // let block_number = event.block_number;

    // let contract_type = "erc721"; // TODO: Get from dynamodb

    // let token_uri = get_token_uri(
    //     client,
    //     token_id_low,
    //     token_id_high,
    //     contract_address,
    //     block_number,
    // )
    // .await;

    // info!("Contract address: {} - Contract type: {} - Token ID: {} - Token URI: {} - Block number: {}",
    //            contract_address, contract_type, token_id, token_uri, block_number
    //        );

    // if from_address == "0x0" {
    //     let mint_object = serde_json::json!({
    //         "event_type": "mint",
    //         "transaction_hash": transaction_hash,
    //         "block_hash": block_hash,
    //         "from_address": from_address,
    //         "to_address": to_address,
    //         "contract_type": contract_attributes.contract_type,
    //         "collection_address": contract_address,
    //         "token_id": token_id,
    //         "token_uri": token_uri,
    //         "block_number": block_number,
    //         "token_name": contract_attributes.name.to_string(),
    //         "token_symbol": contract_attributes.symbol.to_string(),
    //         "timestamp": timestamp.to_string()
    //     });

    //     info!("Mint detected: {:?}", mint_object);

    //     let json_event = serde_json::to_string(&mint_object).unwrap();

    //     info!(
    //         "Sending mint event to Kinesis stream: {}",
    //         kinesis_stream.as_str()
    //     );

    //     send_to_kinesis(
    //         kinesis_client,
    //         kinesis_stream.as_str(),
    //         transaction_hash,
    //         &json_event,
    //     )
    //     .await
    //     .unwrap();
    // }

    Ok(())
}
