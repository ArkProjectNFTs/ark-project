use crate::starknet::client::call_contract;
use crate::utils::hex_array_to_string;
use hex;
use reqwest::Client;
use serde_json::Value;
use starknet::core::types::FieldElement;
use starknet::core::utils::get_selector_from_name;
use std::collections::HashMap;

fn _get_selector_as_string(selector: &String) -> String {
    let selector_field = get_selector_from_name(&selector).unwrap();
    let bytes = selector_field.to_bytes_be();
    let hex_selector = hex::encode(bytes);
    hex_selector
}

pub fn decode_long_string(string_array: &Vec<String>) -> String {
    println!("decode_long_string: {:?}", string_array);
    let long_string = hex_array_to_string(string_array).unwrap();
    long_string
}

pub async fn get_contract_property_string(
    client: &Client,
    event: &HashMap<String, Value>,
    selector_name: &str,
    calldata: Vec<&str>,
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
    .await
    {
        Ok(property) => match &property {
            Value::String(string) => string.to_string(),
            Value::Null => "undefined".to_string(),
            Value::Array(array) => {
                println!("array: {:?} {:?}", array, event.get("from_address"));

                let string_array: Vec<String> = array
                    .clone()
                    .into_iter()
                    .map(|v| v.as_str().unwrap().to_string())
                    .collect();

                println!("string_array: {:?}", string_array);

                decode_long_string(&string_array)
            }
            _ => "undefined".to_string(),
        },
        Err(_) => "undefined".to_string(),
    }
}
