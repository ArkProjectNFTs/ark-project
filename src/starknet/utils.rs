use crate::{starknet::client::call_contract, utils::decode_long_string};
use hex;
use reqwest::Client;
use serde_json::Value;
use starknet::core::{
    types::FieldElement,
    utils::{get_selector_from_name, parse_cairo_short_string},
};
use std::collections::HashMap;

fn _get_selector_as_string(selector: &String) -> String {
    let selector_field = get_selector_from_name(&selector).unwrap();
    let bytes = selector_field.to_bytes_be();
    let hex_selector = hex::encode(bytes);
    hex_selector
}

pub fn decode_string_array(string_array: &Vec<String>) -> String {
    println!("decode_long_string: {:?}", string_array);

    let array_size = string_array.len();
    println!("array_size: {:?}", array_size);

    if string_array.len() == 1 {
        let felt: FieldElement = FieldElement::from_hex_be(string_array[0].as_str()).unwrap();
        let short_string = parse_cairo_short_string(&felt).unwrap();

        println!("short_string: {:?}", short_string);

        short_string
    } else if (string_array.len() == 3) {
        // Decode short string with 2 felts

        let felt1: FieldElement = FieldElement::from_hex_be(string_array[1].as_str()).unwrap();
        let short_string1 = parse_cairo_short_string(&felt1).unwrap();

        let felt2: FieldElement = FieldElement::from_hex_be(string_array[2].as_str()).unwrap();
        let short_string2 = parse_cairo_short_string(&felt2).unwrap();

        short_string1 + &short_string2
    } else {
        let long_string = decode_long_string(string_array).unwrap();
        long_string
    }
}

pub async fn get_contract_property_string(
    client: &Client,
    event: &HashMap<String, Value>,
    selector_name: &str,
    calldata: Vec<&str>,
) -> String {
    let selector_string = selector_name.to_string();

    println!("selector_string: {:?}", selector_string);

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
                println!("array: {:?}", array);

                let string_array: Vec<String> = array
                    .clone()
                    .into_iter()
                    .map(|v| v.as_str().unwrap().to_string())
                    .collect();

                decode_string_array(&string_array)
            }
            _ => "undefined".to_string(),
        },
        Err(_) => "undefined".to_string(),
    }
}
