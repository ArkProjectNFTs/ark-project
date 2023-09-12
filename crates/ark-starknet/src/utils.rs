use log::{error, info};
use reqwest::Client as ReqwestClient;
use serde_json::Value;
use starknet::core::utils::get_selector_from_name;
use starknet::core::{types::FieldElement, utils::parse_cairo_short_string};
use std::error::Error;

use super::client::call_contract;

fn convert_felt_array_to_string(value1: &str, value2: &str) -> String {
    // Decode short string with 2 felts

    let felt1: FieldElement = FieldElement::from_hex_be(value1).unwrap();
    info!("Felt1: {:?}", felt1);
    let short_string1 = parse_cairo_short_string(&felt1).unwrap();
    info!("Short string1: {:?}", short_string1);

    let felt2: FieldElement = FieldElement::from_hex_be(value2).unwrap();
    info!("Felt2: {:?}", felt2);
    let short_string2 = parse_cairo_short_string(&felt2).unwrap();
    info!("Short string2: {:?}", short_string2);

    short_string1 + &short_string2
}

pub fn decode_string_array(string_array: &Vec<String>) -> String {
    info!("String array: {:?}", string_array);

    match string_array.len() {
        0 => "".to_string(),
        1 => {
            let felt: FieldElement = FieldElement::from_hex_be(&string_array[0]).unwrap();
            parse_cairo_short_string(&felt).unwrap()
        }
        2 => {
            let value1 = &string_array[0];
            let value2 = &string_array[1];
            info!("Values: {:?} - {:?}", value1, value2);
            convert_felt_array_to_string(value1, value2)
        }
        3 => convert_felt_array_to_string(&string_array[1], &string_array[2]),
        _ => {
            if let Some((_array_size, new_string_array)) = string_array.split_first() {
                info!("New string array: {:?}", new_string_array);
                let new_string_array: Vec<String> = new_string_array.to_vec();
                let long_string = decode_long_string(&new_string_array).unwrap();
                info!("Long string: {}", long_string);
                long_string
            } else {
                panic!("String array is empty!");
            }
        }
    }
}

pub async fn get_contract_property_string(
    client: &ReqwestClient,
    contract_address: &str,
    selector_name: &str,
    calldata: Vec<String>,
    block_number: u64,
) -> String {
    info!("Getting contract property: {:?}", selector_name);

    match call_contract(
        client,
        contract_address,
        selector_name,
        calldata,
        block_number,
    )
    .await
    {
        Ok(property) => match &property {
            Value::String(string) => string.to_string(),
            Value::Null => "undefined".to_string(),
            Value::Array(array) => {
                info!("Array: {:?}", array);

                let string_array: Vec<String> = array
                    .clone()
                    .into_iter()
                    .map(|v| v.as_str().unwrap().to_string())
                    .collect();

                info!("String array: {:?}", string_array);

                let long_string = decode_string_array(&string_array);
                info!("Long string: {}", long_string);
                long_string
            }
            _ => "undefined".to_string(),
        },
        Err(_) => "undefined".to_string(),
    }
}

pub fn decode_long_string(array: &Vec<String>) -> Result<String, Box<dyn Error>> {
    let mut result = String::new();
    for hex_str in array {
        let hex_str_without_prefix = hex_str.strip_prefix("0x").unwrap_or(hex_str);

        // Prepend a zero if the length is odd
        let hex_str_fixed_length = if hex_str_without_prefix.len() % 2 != 0 {
            format!("0{}", hex_str_without_prefix)
        } else {
            hex_str_without_prefix.to_string()
        };

        info!("Hex string: {}", hex_str_fixed_length);

        let bytes = hex::decode(hex_str_fixed_length)?;
        match String::from_utf8(bytes) {
            Ok(str) => {
                if !str.is_empty() {
                    info!("result: {}", result);
                    result.push_str(&str);
                }
            }
            Err(err) => {
                error!("UTF-8 parsing error: {:?}", err);
            }
        }
    }

    info!("result: {}", result);
    Ok(result)
}

pub fn get_selector_as_string(selector: &str) -> String {
    let selector_field = get_selector_from_name(selector).unwrap();
    let bytes = selector_field.to_bytes_be();
    hex::encode(bytes)
}
