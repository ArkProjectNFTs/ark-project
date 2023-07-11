use dotenv::dotenv;
use reqwest::Client;
use serde_json::{json, Value};
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
    println!(
        "RPC starknet_getEvents response time: {} ms",
        elapsed_time_ms
    );

    Ok(block)
}

pub async fn call_contract(
    client: &Client,
    contract_address: &str,
    block_id: u64,
    selector: &str,
    calldata: Vec<&str>,
) -> Result<Value, Box<dyn Error>> {
    dotenv().ok();
    let rpc_provider = env::var("RPC_PROVIDER").expect("RPC_PROVIDER must be set");
    let payload = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "starknet_call",
        "params": {
            "request": {
                "contract_address": contract_address,
                "entry_point_selector": selector,
                "calldata": calldata,
                "signature": []
            },
            "block_id": {
                "block_number": block_id
            }
        }
    });

    let start_time = Instant::now();
    let response = client.post(rpc_provider).json(&payload).send().await?;
    let result: Value = response.json().await?;

    println!("result: {:?}", result);

    let elapsed_time = start_time.elapsed();
    let elapsed_time_ms = elapsed_time.as_millis();
    println!(
        "RPC starknet_getEvents response time: {} ms",
        elapsed_time_ms
    );

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
    println!(
        "RPC starknet_getEvents response time: {} ms",
        elapsed_time_ms
    );

    let block_number = result
        .get("result")
        .and_then(Value::as_u64)
        .ok_or("Failed to parse block number")?;
    Ok(block_number)
}
