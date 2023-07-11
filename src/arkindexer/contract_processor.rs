use crate::constants::BLACKLIST;
use crate::dynamo::create::{add_collection_item, Item};
use crate::kinesis::send::send_to_kinesis;
use crate::starknet::utils::get_contract_property_string;
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_kinesis::Client as KinesisClient;
use dotenv::dotenv;
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

pub async fn get_contract_type_and_token_uri(
    client: &Client,
    event: HashMap<String, Value>,
) -> (String, String) {
    let token_uri = get_contract_property_string(&client, &event, "tokenURI", vec!["1", "0"]).await;
    let uri_result = get_contract_property_string(&client, &event, "uri", vec![]).await;

    let contract_type = if token_uri != "null" {
        ERC721.to_string()
    } else if uri_result != "null" {
        ERC1155.to_string()
    } else {
        UNKNOWN.to_string()
    };

    (contract_type, token_uri)
}

pub async fn get_contract_attributes(
    client: &Client,
    event: HashMap<String, Value>,
    contract_type: String,
) -> Result<ContractAttributes, Box<dyn Error>> {
    let (name, supply, symbol) = if contract_type != "unknown" {
        let name = get_contract_property_string(&client, &event, "name", [].to_vec()).await;
        let supply = String::from("0"); // get_contract_property_string(&client, &event, "totalSupply", [].to_vec()).await;
        let symbol = get_contract_property_string(&client, &event, "symbol", [].to_vec()).await;
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
        println!("Event: {:?}", event);

        // Filter contract with most transactions from identification
        if let Some(from_address) = event.get("from_address").and_then(|addr| addr.as_str()) {
            if BLACKLIST.contains(&from_address) {
                filtered_count += 1;
                continue;
            }
        }

        // Get contract address

        let from_address = event.get("from_address").unwrap().as_str().unwrap();
        let transaction_hash = event.get("transaction_hash").unwrap().as_str().unwrap();
        let block_hash = event.get("block_hash").unwrap().as_str().unwrap();

        // let to_address = event.get("to_address").unwrap().as_str().unwrap();

        // check if contract present and is a NFT then send event to the kinesis stream

        let (contract_type, token_uri) =
            get_contract_type_and_token_uri(&client, event.clone()).await;

        println!(
            "Contract address: {} - Contract type: {} - Token URI: {}",
            from_address, contract_type, token_uri
        );

        let contract_attributes =
            get_contract_attributes(&client, event.clone(), contract_type.clone())
                .await
                .unwrap();

        if contract_type == "erc721" || contract_type == "erc1155" {
            // Extracting "data" from event
            if let Some(data) = event.get("data") {
                println!("Data: {:?}", data);

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

                    if from_address == "0x0" {
                        let mint_object = serde_json::json!({
                            "transaction_hash": transaction_hash,
                            "block_hash": block_hash,
                            "from_address": from_address,
                            "to_address": to_address,
                            "contract_type": contract_attributes.contract_type,
                            "collection_address": from_address,
                            "token_id": token_id_big_uint.to_str_radix(10),
                            "token_uri": token_uri
                        });

                        println!("Mint detected: {:?}", mint_object);

                        let json_event = serde_json::to_string(&mint_object).unwrap();
                        send_to_kinesis(
                            &kinesis_client,
                            kinesis_stream.as_str(),
                            "mint",
                            &json_event,
                        )
                        .await
                        .unwrap();
                    }
                }
            }
        }

        let item = Item {
            name: contract_attributes.name.clone(),
            total_supply: contract_attributes.supply.clone(),
            symbol: contract_attributes.symbol.clone(),
            address: from_address.to_string(),
            contract_deployer: "".to_string(),
            deployed_block_number: "".to_string(),
            contract_type: contract_type.clone(),
        };
        match add_collection_item(&dynamo_client, item, &table).await {
            Ok(collection) => {
                println!(
                    "Collection successfully added: {:?} {}, type: {}",
                    collection, from_address, contract_type
                );
            }
            Err(e) => {
                eprintln!("Error while adding collection: {:?}", e);
            }
        }
    }

    println!("Blacklist filtered events: {}", filtered_count);
    let duration = start_time.elapsed();
    println!("Time elapsed in contracts block is: {:?}", duration);
}
