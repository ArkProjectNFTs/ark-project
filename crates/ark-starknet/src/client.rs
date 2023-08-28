use anyhow::{anyhow, Result};
use super::utils::{get_contract_property_string, get_selector_as_string};
use log::info;
use reqwest::Client as ReqwestClient;
use serde_json::{json, Value};
use starknet::core::types::FieldElement;
use std::collections::HashMap;
use std::env;
use std::time::Instant;

pub async fn fetch_block(
    client: &ReqwestClient,
    block_number: u64,
) -> Result<HashMap<String, Value>> {
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

pub async fn get_block_with_txs(
    client: &ReqwestClient,
    block_number: u64,
) -> Result<Value> {
    let rpc_provider = env::var("RPC_PROVIDER").expect("RPC_PROVIDER must be set");
    let payload = json!({
        "id": 1,
        "jsonrpc": "2.0",
        "method": "starknet_getBlockWithTxs",
        "params":  {
            "block_id": {
                "block_number": block_number
            }
        }
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

    Ok(result.get("result").cloned().unwrap_or(Value::Null))
}

pub async fn call_contract(
    client: &ReqwestClient,
    contract_address: &str,
    selector_name: &str,
    calldata: Vec<&str>,
    block_number: u64,
) -> Result<Value> {
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

    info!("RPC Result: {:?}", result);

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
            return Err(anyhow!("Invalid message selector"))
        }
    }

    Ok(result.get("result").cloned().unwrap_or(Value::Null))
}

pub async fn get_latest_block(client: &ReqwestClient) -> Result<u64> {
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
        .ok_or(anyhow!("Failed to parse block number"))?;
    Ok(block_number)
}

pub async fn get_contract_type(
    client: &ReqwestClient,
    contract_address: &str,
    block_number: u64,
) -> String {
    let token_uri_cairo_0 = get_contract_property_string(
        client,
        contract_address,
        "tokenURI",
        vec!["1", "0"],
        block_number,
    )
    .await;

    let token_uri = get_contract_property_string(
        client,
        contract_address,
        "token_uri",
        vec!["1", "0"],
        block_number,
    )
    .await;

    // Get uri
    let uri_result: String =
        get_contract_property_string(client, contract_address, "uri", [].to_vec(), block_number)
            .await;

    // Init contract type
    let mut contract_type = "unknown".to_string();
    if (token_uri_cairo_0 != "undefined" && !token_uri_cairo_0.is_empty())
        || (token_uri != "undefined" && !token_uri.is_empty())
    {
        contract_type = "erc721".to_string()
    } else if uri_result != "undefined" {
        contract_type = "erc1155".to_string()
    }

    contract_type
}

pub async fn get_token_owner(
    client: &ReqwestClient,
    token_id_low: FieldElement,
    token_id_high: FieldElement,
    contract_address: &str,
    block_number: u64,
) -> String {
    let token_id_low_hex = format!("{:x}", token_id_low);
    let token_id_high_hex = format!("{:x}", token_id_high);
    let calldata = vec![token_id_low_hex.as_str(), token_id_high_hex.as_str()];

    match call_contract(client, contract_address, "ownerOf", calldata, block_number).await {
        Ok(result) => {
            if let Some(token_owner) = result.get(0) {
                token_owner.to_string().replace('\"', "")
            } else {
                "".to_string()
            }
        }
        Err(_error) => "".to_string(),
    }
}
