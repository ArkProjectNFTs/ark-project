use crate::{starknet::client::call_contract, utils::decode_long_string};
use hex;
use log::info;
use reqwest::Client;
use serde_json::Value;
use starknet::core::{
    types::FieldElement,
    utils::{get_selector_from_name, parse_cairo_short_string},
};
use std::collections::HashMap;

fn convert_felt_array_to_string(value1: &str, value2: &str) -> String {
    // Decode short string with 2 felts

    let felt1: FieldElement = FieldElement::from_hex_be(value1).unwrap();
    let short_string1 = parse_cairo_short_string(&felt1).unwrap();

    let felt2: FieldElement = FieldElement::from_hex_be(value2).unwrap();
    let short_string2 = parse_cairo_short_string(&felt2).unwrap();

    short_string1 + &short_string2
}
pub fn decode_string_array(string_array: &Vec<String>, log: bool) -> String {
    if log {
        info!("Initial String Array: {:?}", string_array);
    }

    let array_size = string_array.len();

    if log {
        info!("Array size: {:?}", array_size);
    }

    match string_array.len() {
        1 => {
            let felt: FieldElement = FieldElement::from_hex_be(&string_array[0]).unwrap();
            let short_string = parse_cairo_short_string(&felt).unwrap();

            if log {
                info!("Decoded string: {:?}", short_string);
            }

            short_string
        }
        2 | 3 => {
            let decoded_string = convert_felt_array_to_string(
                &string_array[1],
                &string_array[2 % string_array.len()],
            );

            if log {
                info!("Decoded string: {:?}", decoded_string);
            }

            decoded_string
        }
        _ => {
            if let Some((_, new_string_array)) = string_array.split_first() {
                let new_string_array: Vec<String> = new_string_array.to_vec();
                let long_string = decode_long_string(&new_string_array).unwrap();
                long_string
            } else {
                panic!("String array is empty!");
            }
        }
    }
}

pub async fn get_contract_property_string(
    client: &Client,
    contract_address: &str,
    selector_name: &str,
    calldata: Vec<&str>,
    log: bool,
    block_number: u64,
) -> String {
    match call_contract(
        &client,
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
                let string_array: Vec<String> = array
                    .clone()
                    .into_iter()
                    .map(|v| v.as_str().unwrap().to_string())
                    .collect();

                decode_string_array(&string_array, log)
            }
            _ => "undefined".to_string(),
        },
        Err(_) => "undefined".to_string(),
    }
}
