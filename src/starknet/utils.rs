use crate::{starknet::client::call_contract, utils::decode_long_string};
use log::info;
use reqwest::Client;
use serde_json::Value;
use starknet::core::{types::FieldElement, utils::parse_cairo_short_string};

fn convert_felt_array_to_string(value1: &str, value2: &str) -> String {
    // Decode short string with 2 felts

    let felt1: FieldElement = FieldElement::from_hex_be(value1).unwrap();
    info!("Felt1: {:?}", felt1);

    let short_string1 = parse_cairo_short_string(&felt1).unwrap();
    info!("Short string1: {:?}", short_string1);

    let felt2: FieldElement = FieldElement::from_hex_be(value2).unwrap();
    let short_string2 = parse_cairo_short_string(&felt2).unwrap();

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
        3 => convert_felt_array_to_string(&string_array[1], &string_array[0]),
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
    client: &reqwest::Client,
    contract_address: &str,
    selector_name: &str,
    calldata: Vec<&str>,
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

                let long_string = decode_string_array(&string_array);
                info!("Long string: {}", long_string);
                long_string
            }
            _ => "undefined".to_string(),
        },
        Err(_) => "undefined".to_string(),
    }
}
