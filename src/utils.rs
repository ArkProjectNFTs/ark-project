extern crate hex;

use serde_json::Value;
use starknet::core::utils::starknet_keccak;
use std::collections::HashMap;
use std::error::Error;

pub fn extract_events(block: &HashMap<String, Value>) -> Vec<Value> {
    let events = block.get("result").unwrap().get("events").unwrap();
    events.as_array().unwrap().clone()
}

pub fn filter_transfer_events(events: Vec<Value>, event_hash: &str) -> Vec<HashMap<String, Value>> {
    events
        .iter()
        .filter_map(|event| event.as_object())
        .filter(|event| {
            event
                .get("keys")
                .and_then(|keys| keys.as_array())
                .map_or(false, |keys| {
                    keys.iter().any(|key| key.as_str() == Some(event_hash))
                })
        })
        .map(|event_map| {
            event_map
                .iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect::<HashMap<String, Value>>()
        })
        .collect()
}

pub fn get_selector_from_name(name: &str) -> String {
    let selector = format!("0x{:x}", starknet_keccak(name.as_bytes()));
    selector
}

pub fn decode_long_string(array: &Vec<String>) -> Result<String, Box<dyn Error>> {
    let mut result = String::new();
    for hex_str in array {
        let hex_str_without_prefix = hex_str.strip_prefix("0x").unwrap_or(&hex_str);

        // Prepend a zero if the length is odd
        let hex_str_fixed_length = if hex_str_without_prefix.len() % 2 != 0 {
            format!("0{}", hex_str_without_prefix)
        } else {
            hex_str_without_prefix.to_string()
        };

        let bytes = hex::decode(hex_str_fixed_length)?;
        let str = String::from_utf8(bytes)?;
        result.push_str(&str);
    }

    Ok(result)
}
