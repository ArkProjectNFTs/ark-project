use crate::constants::BLACKLIST;
use crate::dynamo::create::{register_collection_item, register_indexed_contract, CollectionItem};
use crate::kinesis::send::send_to_kinesis;
use crate::starknet::utils::get_contract_property_string;
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_kinesis::Client as KinesisClient;
use dotenv::dotenv;
use log::info;
use num_bigint::BigUint;
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use std::env;
use std::error::Error;
use std::time::Instant;

// Constant values
const ERC721: &str = "erc721";
const ERC1155: &str = "erc1155";
const UNKNOWN: &str = "unknown";

#[derive(Debug)]
pub struct ContractAttributes {
    name: String,
    supply: String,
    symbol: String,
    contract_type: String,
}

fn left_pad_hex_32(hex_string: String) -> String {
    let trimmed_string = hex_string.as_str().trim_start_matches("0x");
    let padded_string = format!("{:0>32}", trimmed_string);
    padded_string
}

pub async fn get_contract_type(
    client: &Client,
    contract_address: &str,
    block_number: u64,
) -> String {
    let token_uri_cairo_0 = get_contract_property_string(
        &client,
        contract_address,
        "tokenURI",
        vec!["1", "0"],
        false,
        block_number,
    )
    .await;
    let token_uri = get_contract_property_string(
        &client,
        contract_address,
        "token_uri",
        vec!["1", "0"],
        false,
        block_number,
    )
    .await;
    let uri_result = get_contract_property_string(
        &client,
        contract_address,
        "uri",
        vec![],
        false,
        block_number,
    )
    .await;

    info!(
        "Token 1 ({:?}) => tokenURI: {:?} / token_uri: {:?}",
        contract_address, token_uri_cairo_0, token_uri
    );

    if (token_uri_cairo_0 != "undefined" && token_uri_cairo_0 != "")
        || (token_uri != "undefined" && token_uri != "")
    {
        ERC721.to_string()
    } else if uri_result != "undefined" {
        ERC1155.to_string()
    } else {
        UNKNOWN.to_string()
    }
}

async fn get_token_id(
    client: &Client,
    token_id_low: &str,
    token_id_high: &str,
    contract_address: &str,
    block_number: u64,
) -> String {
    info!("get_token_id: [{:?}, {:?}]", token_id_low, token_id_high);

    let token_uri_cairo0 = get_contract_property_string(
        &client,
        contract_address,
        "tokenURI",
        vec![token_id_low, token_id_high],
        true,
        block_number,
    )
    .await;

    info!("token_uri_cairo0: {:?}", token_uri_cairo0);

    if token_uri_cairo0 != "undefined" && token_uri_cairo0 != "" {
        return token_uri_cairo0;
    }

    let token_uri = get_contract_property_string(
        &client,
        contract_address,
        "token_uri",
        vec![token_id_low, token_id_high],
        true,
        block_number,
    )
    .await;

    info!("token_uri: {:?}", token_uri);

    if token_uri != "undefined" && token_uri != "" {
        return token_uri;
    }

    String::from("undefined")
}

pub async fn get_contract_attributes(
    client: &Client,
    contract_type: String,
    contract_address: &str,
    block_number: u64,
) -> Result<ContractAttributes, Box<dyn Error>> {
    let (name, supply, symbol) = if contract_type != "unknown" {
        let name = get_contract_property_string(
            &client,
            contract_address,
            "name",
            [].to_vec(),
            false,
            block_number,
        )
        .await;
        let supply = get_contract_property_string(
            &client,
            contract_address,
            "totalSupply",
            [].to_vec(),
            false,
            block_number,
        )
        .await;
        let symbol = get_contract_property_string(
            &client,
            contract_address,
            "symbol",
            [].to_vec(),
            false,
            block_number,
        )
        .await;
        (name, supply.to_string(), symbol.to_string())
    } else {
        println!("Contract type is unknown, skipping fetch assigning default values");
        // Assign some default values if the contract type is unknown
        (
            "Unknown name".to_string(),
            "0".to_string(),
            "Unknown symbol".to_string(),
        )
    };

    Ok(ContractAttributes {
        name: name,
        symbol: symbol,
        supply: supply,
        contract_type: contract_type,
    })
}

// Identifies contract types based on events from ABIs, checks for their presence in a Redis server, and if not found, calls contract methods to determine the type, stores this information back in Redis, and finally prints the contract type.
pub async fn identify_contract_types_from_transfers(
    client: &Client,
    events: Vec<HashMap<String, Value>>,
    dynamo_client: &DynamoClient,
    kinesis_client: &KinesisClient,
) {
    // Get dynamo table to work with
    dotenv().ok();
    let table =
        env::var("ARK_COLLECTIONS_TABLE_NAME").expect("ARK_COLLECTIONS_TABLE_NAME must be set");
    let kinesis_stream = env::var("KINESIS_STREAM_NAME").expect("KINESIS_STREAM_NAME must be set");

    // Init start time
    let start_time = Instant::now();
    let mut filtered_count = 0;

    for event in events {
        // Filter contract with most transactions from identification
        if let Some(from_address) = event.get("from_address").and_then(|addr| addr.as_str()) {
            if BLACKLIST.contains(&from_address) {
                filtered_count += 1;
                continue;
            }
        }

        info!("Raw Event: {:?}", event);

        // Get contract address

        let contract_address = event.get("from_address").unwrap().as_str().unwrap();
        let transaction_hash = event.get("transaction_hash").unwrap().as_str().unwrap();
        let block_hash = event.get("block_hash").unwrap().as_str().unwrap();
        let block_number = event.get("block_number").unwrap().as_u64().unwrap();

        // let to_address = event.get("to_address").unwrap().as_str().unwrap();

        // check if contract present and is a NFT then send event to the kinesis stream

        let contract_type = get_contract_type(&client, contract_address, block_number).await;

        let contract_attributes = get_contract_attributes(
            &client,
            contract_type.clone(),
            contract_address.clone(),
            block_number,
        )
        .await
        .unwrap();

        let is_nft = contract_type == "erc721" || contract_type == "erc1155";

        if is_nft {
            // Extracting "data" from event
            if let Some(data) = event.get("data") {
                if let Some(data_array) = data.as_array() {
                    let data_strings: Vec<String> = data_array
                        .iter()
                        .filter_map(|v| v.as_str())
                        .map(|s| s.to_string())
                        .collect();

                    let from_address = data_strings[0].as_str();
                    let to_address = data_strings[1].as_str();

                    let low = u128::from_str_radix(&left_pad_hex_32(data_strings[2].clone()), 16)
                        .unwrap();
                    let high = u128::from_str_radix(&left_pad_hex_32(data_strings[3].clone()), 16)
                        .unwrap();

                    let low_bytes = low.to_be_bytes();
                    let high_bytes = high.to_be_bytes();

                    let mut bytes: Vec<u8> = Vec::new();
                    bytes.extend(high_bytes);
                    bytes.extend(low_bytes);

                    let token_id_big_uint = BigUint::from_bytes_be(&bytes[..]);
                    let token_id = token_id_big_uint.to_str_radix(10);

                    let token_uri = get_token_id(
                        &client,
                        &data_strings[2].as_str(),
                        &data_strings[3].as_str(),
                        contract_address.clone(),
                        block_number,
                    )
                    .await;

                    info!(
                        "Contract address: {} - Contract type: {} - Token ID: {} - Token URI: {} - Block number: {}",
                        contract_address, contract_type, token_id, token_uri, block_number
                    );

                    if from_address == "0x0" {
                        let mint_object = serde_json::json!({
                            "event_type": "mint",
                            "transaction_hash": transaction_hash,
                            "block_hash": block_hash,
                            "from_address": from_address,
                            "to_address": to_address,
                            "contract_type": contract_attributes.contract_type,
                            "collection_address": contract_address,
                            "token_id": token_id,
                            "token_uri": token_uri,
                            "block_number": block_number,
                            "token_name": contract_attributes.name.to_string(),
                            "token_symbol": contract_attributes.symbol.to_string()
                        });

                        info!("Mint detected: {:?}", mint_object);

                        let json_event = serde_json::to_string(&mint_object).unwrap();

                        info!(
                            "Sending mint event to Kinesis stream: {}",
                            kinesis_stream.as_str()
                        );

                        send_to_kinesis(
                            &kinesis_client,
                            kinesis_stream.as_str(),
                            transaction_hash,
                            &json_event,
                        )
                        .await
                        .unwrap();
                    }
                }
            }

            let collection_item = CollectionItem {
                name: contract_attributes.name.clone(),
                total_supply: contract_attributes.supply.clone(),
                symbol: contract_attributes.symbol.clone(),
                address: contract_address.to_string(),
                contract_deployer: "".to_string(),
                deployed_block_number: "".to_string(),
                contract_type: contract_type.clone(),
            };
            match register_collection_item(&dynamo_client, collection_item, &table).await {
                Ok(success) => {
                    info!(
                        "[Success] New collection item added successfully.\n\
                        - Item Details: {:?}\n\
                        - Table: {}",
                        success, &table
                    );
                }
                Err(e) => {
                    eprintln!(
                        "[Error] Failed to add a new item to the collection.\n\
                        - Error Details: {:?}\n\
                        - Target Table: {}",
                        e, &table
                    );
                }
            }
        }

        match register_indexed_contract(&dynamo_client, contract_address.to_string(), is_nft).await
        {
            Ok(_) => {}
            Err(e) => {
                eprintln!(
                    "[Error] Failed to add a new item in 'indexed_contract' table.\n\
                    - Contract Address: {}\n\
                    - Error Details: {:?}\n\
                    - Context: While attempting to index new contracts.",
                    contract_address, e
                );
            }
        }
    }

    info!("Blacklist filtered events: {}", filtered_count);
    let duration = start_time.elapsed();
    info!("Time elapsed in contracts block is: {:?}", duration);
}
