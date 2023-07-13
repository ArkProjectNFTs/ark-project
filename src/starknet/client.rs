use core::panic;
use dotenv::dotenv;
use log::{info, trace};
use reqwest::Client;
use serde_json::{json, Value};
use starknet::core::utils::get_selector_from_name;
use std::collections::HashMap;
use std::env;
use std::error::Error;
use std::time::Instant;

pub async fn fetch_block(
    client: &Client,
    block_number: u64,
) -> Result<HashMap<String, Value>, Box<dyn std::error::Error>> {
    dotenv().ok();
    let rpc_provider = env::var("RPC_PROVIDER").expect("RPC_PROVIDER must be set");
    let payload = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "starknet_getEvents",
        "params": {
            "filter": {
                "from_block": {
                  "block_number": block_number
                },
                "to_block": {
                  "block_number": block_number
                },
                "chunk_size": 1000,
              }
        }
    });

    let start_time = Instant::now();
    let resp = client.post(rpc_provider).json(&payload).send().await?;
    let block: HashMap<String, Value> = resp.json().await?;

    let elapsed_time = start_time.elapsed();
    let elapsed_time_ms = elapsed_time.as_millis();
    info!(
        "RPC starknet_getEvents response time: {} ms",
        elapsed_time_ms
    );

    Ok(block)
}

fn get_selector_as_string(selector: &String) -> String {
    let selector_field = get_selector_from_name(&selector).unwrap();
    let bytes = selector_field.to_bytes_be();
    let hex_selector = hex::encode(bytes);
    hex_selector
}

pub async fn call_contract(
    client: &Client,
    contract_address: &str,
    selector_name: &str,
    calldata: Vec<&str>,
    block_number: u64,
) -> Result<Value, Box<dyn Error>> {
    dotenv().ok();
    let rpc_provider = env::var("RPC_PROVIDER").expect("RPC_PROVIDER must be set");

    let selector_string = selector_name.to_string();
    let selector = get_selector_as_string(&selector_string);

    let payload = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "starknet_call",
        "params": {
            "request": {
                "contract_address": contract_address,
                "entry_point_selector": format!("0x{}", selector),
                "calldata": calldata,
                "signature": []
            },
            "block_id": {
                "block_number": block_number
            }
        }
    });

    info!("RPC Payload: {:?} - Selector: {:?}", payload, selector_name);

    let start_time = Instant::now();
    let response = client.post(rpc_provider).json(&payload).send().await?;
    let result: Value = response.json().await?;

    let elapsed_time = start_time.elapsed();
    let elapsed_time_ms = elapsed_time.as_millis();
    info!(
        "RPC starknet_getEvents response time: {} ms",
        elapsed_time_ms
    );

    if let Some(error) = result.get("error") {
        let error_code = error["code"].as_u64().unwrap_or(0);
        let error_message = error["message"].as_str().unwrap_or("");
        if error_code == 21 && error_message == "Invalid message selector" {
            return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Invalid message selector",
            )));
        }
    }

    Ok(result.get("result").cloned().unwrap_or(Value::Null))
}

pub async fn get_latest_block(client: &Client) -> Result<u64, Box<dyn Error>> {
    dotenv().ok();
    let rpc_provider = env::var("RPC_PROVIDER").expect("RPC_PROVIDER must be set");
    let payload: Value = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "starknet_blockNumber",
        "params": {}
    });

    let start_time = Instant::now();
    let response = client.post(rpc_provider).json(&payload).send().await?;
    let result: Value = response.json().await?;

    let elapsed_time = start_time.elapsed();
    let elapsed_time_ms = elapsed_time.as_millis();
    info!(
        "RPC starknet_getEvents response time: {} ms",
        elapsed_time_ms
    );

    let block_number = result
        .get("result")
        .and_then(Value::as_u64)
        .ok_or("Failed to parse block number")?;
    Ok(block_number)
}
