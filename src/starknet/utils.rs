use log::info;
use num_bigint::BigUint;
use serde_json::Value;
use starknet::core::{types::FieldElement, utils::parse_cairo_short_string};

use crate::{
    starknet::client::call_contract,
    utils::{decode_long_string, format_token_id},
};

pub struct TokenIdTransformation {
    pub low: u128,
    pub high: u128,
    pub token_id: String,
    pub padded_token_id: String,
}

pub struct TokenId {
    pub low: FieldElement,
    pub high: FieldElement,
}

impl TokenId {
    // Implement the format_token_id as a method on the struct
    pub fn convert(&self) -> TokenIdTransformation {
        // let token_id_low_hex = format!("{:#064x}", token_id_low);
        // let token_id_high_hex = format!("{:#064x}", token_id_high);

        // let low = u128::from_str_radix(token_id_low.to_string().as_str(), 10).unwrap();
        let low = self.low.to_string().as_str().parse::<u128>().unwrap();

        // let high = u128::from_str_radix(token_id_high.to_string().as_str(), 10).unwrap();
        let high = self.high.to_string().as_str().parse::<u128>().unwrap();

        let low_bytes = low.to_be_bytes();
        let high_bytes = high.to_be_bytes();

        let mut bytes: Vec<u8> = Vec::new();
        bytes.extend(high_bytes);
        bytes.extend(low_bytes);

        let token_id_big_uint = BigUint::from_bytes_be(&bytes[..]);
        let token_id: String = token_id_big_uint.to_str_radix(10);
        let padded_token_id = format_token_id(token_id.clone());

        TokenIdTransformation {
            low,
            high,
            token_id: token_id.clone(),
            padded_token_id,
        }
    }
}

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
