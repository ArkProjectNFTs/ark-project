use crate::starknet::client::call_contract;
use crate::utils::hex_array_to_string;
use hex;
use reqwest::Client;
use serde_json::Value;
use starknet::core::utils::get_selector_from_name;
use std::collections::HashMap;

fn _get_selector_as_string(selector: &String) -> String {
    let selector_field = get_selector_from_name(&selector).unwrap();
    // assuming `field_element` is of type FieldElement
    let bytes = selector_field.to_bytes_be();
    // convert the bytes to a hex string
    let hex_selector = hex::encode(bytes);
    hex_selector
}

pub async fn get_contract_property(
    client: &Client,
    event: &HashMap<String, Value>,
    selector_name: &str,
    calldata: Vec<&str>,
    decode_hex: bool,
) -> String {
    let selector_string = selector_name.to_string();
    let selector = _get_selector_as_string(&selector_string);
    match call_contract(
        &client,
        event.get("from_address").unwrap().as_str().unwrap(),
        event.get("block_number").unwrap().as_u64().unwrap(),
        &selector,
        calldata,
    )
    .await {
        Ok(property) => {
            if decode_hex {
                match &property {
                    Value::Array(_) => {
                        match hex_array_to_string(property) {
                            Ok(property_str) => property_str,
                            Err(_) => "undefined".to_string(),
                        }
                    }
                    _ => "undefined".to_string(),
                }
            } else {
                property.to_string()
            }
        },
        Err(_) => "undefined".to_string(),
    }
}
