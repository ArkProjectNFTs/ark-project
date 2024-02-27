use anyhow::Result;
use starknet::core::{types::FieldElement, utils::parse_cairo_short_string};
use std::ops::Add;

use crate::byte_array::ByteArray;

#[derive(Debug)]
pub enum ParseError {
    NoValueFound,
    ShortStringError,
    ByteArrayError,
}

/// Parse a Cairo "long string" represented as a Vec of FieldElements into a Rust String.
///
/// # Arguments
/// * `field_elements`: A vector of FieldElements representing the Cairo long string.
///
/// # Returns
/// * A `Result` which is either the parsed Rust string or an error.
pub fn parse_cairo_long_string(field_elements: Vec<FieldElement>) -> Result<String, ParseError> {
    match field_elements.len() {
        0 => Err(ParseError::NoValueFound),
        // If the long_string contains only one FieldElement, try to parse it using the short string parser.
        1 => match field_elements.first() {
            Some(first_string_field_element) => {
                match parse_cairo_short_string(first_string_field_element) {
                    Ok(value) => Ok(value),
                    Err(_) => Err(ParseError::ShortStringError),
                }
            }
            None => Err(ParseError::NoValueFound),
        },
        // If the long_string has more than one FieldElement, parse each FieldElement sequentially
        // and concatenate their results.
        len => {
            let first_element = field_elements.first().unwrap();
            let a_size = first_element.add(FieldElement::from_dec_str("1").unwrap());

            if len.to_string() == a_size.to_string() {
                let results: Result<Vec<_>, _> = field_elements[1..]
                    .iter()
                    .map(parse_cairo_short_string)
                    .collect();

                results
                    .map(|strings| strings.concat())
                    .map_err(|_| ParseError::ShortStringError)
            } else {
                let data = field_elements[1..field_elements.len() - 2].to_vec();
                let pending_word = field_elements[field_elements.len() - 2].clone();
                let pending_word_len = field_elements[field_elements.len() - 1].clone();
                let pending_word_len =
                    usize::from_str_radix(&pending_word_len.to_string(), 10).unwrap();

                let byte_array = ByteArray {
                    data,
                    pending_word,
                    pending_word_len,
                };

                byte_array
                    .to_string()
                    .map_err(|_| ParseError::ByteArrayError)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::cairo_string_parser::ParseError;

    use super::parse_cairo_long_string;
    use starknet::core::types::FieldElement;

    #[test]
    fn should_handle_single_field_element() {
        let long_string = vec![FieldElement::from_hex_be("0x68").unwrap()];
        let result = parse_cairo_long_string(long_string);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "h");
    }

    #[test]
    fn should_return_error_for_empty_vector() {
        let long_string = vec![];

        let result = parse_cairo_long_string(long_string);

        // First, check that the result is an error.
        assert!(result.is_err());

        // Then, check that it's the specific error you expect.
        match result {
            Err(ParseError::NoValueFound) => {} // expected error, do nothing
            Err(_) => panic!("Unexpected error type returned"),
            Ok(_) => panic!("Expected an error but got a success result"),
        }
    }
    #[test]
    fn should_parse_field_elements_with_array_length() {
        let long_string = vec![
            FieldElement::from_hex_be("0x4").unwrap(),
            FieldElement::from_hex_be(
                "0x68747470733a2f2f6170692e627269712e636f6e737472756374696f6e",
            )
            .unwrap(),
            FieldElement::from_hex_be("0x2f76312f7572692f7365742f").unwrap(),
            FieldElement::from_hex_be("0x737461726b6e65742d6d61696e6e65742f").unwrap(),
            FieldElement::from_hex_be("0x2e6a736f6e").unwrap(),
        ];

        let result = parse_cairo_long_string(long_string);
        assert!(result.is_ok());

        let value = result.unwrap();
        println!("Value: {}", value);
        assert!(value == "https://api.briq.construction/v1/uri/set/starknet-mainnet/.json");
    }

    #[test]
    fn should_parse_one_field_element_per_character_to_url() {
        let long_string = vec![
            FieldElement::from_hex_be("0x2d").unwrap(),
            FieldElement::from_hex_be("0x68").unwrap(),
            FieldElement::from_hex_be("0x74").unwrap(),
            FieldElement::from_hex_be("0x74").unwrap(),
            FieldElement::from_hex_be("0x70").unwrap(),
            FieldElement::from_hex_be("0x73").unwrap(),
            FieldElement::from_hex_be("0x3a").unwrap(),
            FieldElement::from_hex_be("0x2f").unwrap(),
            FieldElement::from_hex_be("0x2f").unwrap(),
            FieldElement::from_hex_be("0x61").unwrap(),
            FieldElement::from_hex_be("0x70").unwrap(),
            FieldElement::from_hex_be("0x69").unwrap(),
            FieldElement::from_hex_be("0x2e").unwrap(),
            FieldElement::from_hex_be("0x73").unwrap(),
            FieldElement::from_hex_be("0x74").unwrap(),
            FieldElement::from_hex_be("0x61").unwrap(),
            FieldElement::from_hex_be("0x72").unwrap(),
            FieldElement::from_hex_be("0x6b").unwrap(),
            FieldElement::from_hex_be("0x6e").unwrap(),
            FieldElement::from_hex_be("0x65").unwrap(),
            FieldElement::from_hex_be("0x74").unwrap(),
            FieldElement::from_hex_be("0x2e").unwrap(),
            FieldElement::from_hex_be("0x71").unwrap(),
            FieldElement::from_hex_be("0x75").unwrap(),
            FieldElement::from_hex_be("0x65").unwrap(),
            FieldElement::from_hex_be("0x73").unwrap(),
            FieldElement::from_hex_be("0x74").unwrap(),
            FieldElement::from_hex_be("0x2f").unwrap(),
            FieldElement::from_hex_be("0x71").unwrap(),
            FieldElement::from_hex_be("0x75").unwrap(),
            FieldElement::from_hex_be("0x65").unwrap(),
            FieldElement::from_hex_be("0x73").unwrap(),
            FieldElement::from_hex_be("0x74").unwrap(),
            FieldElement::from_hex_be("0x73").unwrap(),
            FieldElement::from_hex_be("0x2f").unwrap(),
            FieldElement::from_hex_be("0x75").unwrap(),
            FieldElement::from_hex_be("0x72").unwrap(),
            FieldElement::from_hex_be("0x69").unwrap(),
            FieldElement::from_hex_be("0x3f").unwrap(),
            FieldElement::from_hex_be("0x6c").unwrap(),
            FieldElement::from_hex_be("0x65").unwrap(),
            FieldElement::from_hex_be("0x76").unwrap(),
            FieldElement::from_hex_be("0x65").unwrap(),
            FieldElement::from_hex_be("0x6c").unwrap(),
            FieldElement::from_hex_be("0x3d").unwrap(),
            FieldElement::from_hex_be("0x30").unwrap(),
        ];

        let result = parse_cairo_long_string(long_string);
        assert!(result.is_ok());
        assert!(result.unwrap() == "https://api.starknet.quest/quests/uri?level=0");
    }

    #[test]
    fn should_parse_field_elements_to_url_with_array_length() {
        let long_string = vec![
            FieldElement::from_hex_be("0x44").unwrap(),
            FieldElement::from_hex_be("0x69").unwrap(),
            FieldElement::from_hex_be("0x70").unwrap(),
            FieldElement::from_hex_be("0x66").unwrap(),
            FieldElement::from_hex_be("0x73").unwrap(),
            FieldElement::from_hex_be("0x3a").unwrap(),
            FieldElement::from_hex_be("0x2f").unwrap(),
            FieldElement::from_hex_be("0x2f").unwrap(),
            FieldElement::from_hex_be("0x62").unwrap(),
            FieldElement::from_hex_be("0x61").unwrap(),
            FieldElement::from_hex_be("0x66").unwrap(),
            FieldElement::from_hex_be("0x79").unwrap(),
            FieldElement::from_hex_be("0x62").unwrap(),
            FieldElement::from_hex_be("0x65").unwrap(),
            FieldElement::from_hex_be("0x69").unwrap(),
            FieldElement::from_hex_be("0x65").unwrap(),
            FieldElement::from_hex_be("0x6f").unwrap(),
            FieldElement::from_hex_be("0x63").unwrap(),
            FieldElement::from_hex_be("0x73").unwrap(),
            FieldElement::from_hex_be("0x7a").unwrap(),
            FieldElement::from_hex_be("0x35").unwrap(),
            FieldElement::from_hex_be("0x74").unwrap(),
            FieldElement::from_hex_be("0x78").unwrap(),
            FieldElement::from_hex_be("0x70").unwrap(),
            FieldElement::from_hex_be("0x78").unwrap(),
            FieldElement::from_hex_be("0x67").unwrap(),
            FieldElement::from_hex_be("0x70").unwrap(),
            FieldElement::from_hex_be("0x37").unwrap(),
            FieldElement::from_hex_be("0x7a").unwrap(),
            FieldElement::from_hex_be("0x72").unwrap(),
            FieldElement::from_hex_be("0x78").unwrap(),
            FieldElement::from_hex_be("0x37").unwrap(),
            FieldElement::from_hex_be("0x66").unwrap(),
            FieldElement::from_hex_be("0x65").unwrap(),
            FieldElement::from_hex_be("0x78").unwrap(),
            FieldElement::from_hex_be("0x72").unwrap(),
            FieldElement::from_hex_be("0x64").unwrap(),
            FieldElement::from_hex_be("0x6e").unwrap(),
            FieldElement::from_hex_be("0x65").unwrap(),
            FieldElement::from_hex_be("0x79").unwrap(),
            FieldElement::from_hex_be("0x6a").unwrap(),
            FieldElement::from_hex_be("0x34").unwrap(),
            FieldElement::from_hex_be("0x6b").unwrap(),
            FieldElement::from_hex_be("0x7a").unwrap(),
            FieldElement::from_hex_be("0x71").unwrap(),
            FieldElement::from_hex_be("0x32").unwrap(),
            FieldElement::from_hex_be("0x76").unwrap(),
            FieldElement::from_hex_be("0x34").unwrap(),
            FieldElement::from_hex_be("0x78").unwrap(),
            FieldElement::from_hex_be("0x35").unwrap(),
            FieldElement::from_hex_be("0x67").unwrap(),
            FieldElement::from_hex_be("0x33").unwrap(),
            FieldElement::from_hex_be("0x61").unwrap(),
            FieldElement::from_hex_be("0x73").unwrap(),
            FieldElement::from_hex_be("0x78").unwrap(),
            FieldElement::from_hex_be("0x34").unwrap(),
            FieldElement::from_hex_be("0x35").unwrap(),
            FieldElement::from_hex_be("0x6d").unwrap(),
            FieldElement::from_hex_be("0x36").unwrap(),
            FieldElement::from_hex_be("0x35").unwrap(),
            FieldElement::from_hex_be("0x63").unwrap(),
            FieldElement::from_hex_be("0x78").unwrap(),
            FieldElement::from_hex_be("0x37").unwrap(),
            FieldElement::from_hex_be("0x72").unwrap(),
            FieldElement::from_hex_be("0x67").unwrap(),
            FieldElement::from_hex_be("0x78").unwrap(),
            FieldElement::from_hex_be("0x75").unwrap(),
            FieldElement::from_hex_be("0x2f").unwrap(),
            FieldElement::from_hex_be("0x30").unwrap(),
        ];

        let result = parse_cairo_long_string(long_string);
        assert!(result.is_ok());

        let value = result.unwrap();
        assert!(value == "ipfs://bafybeieocsz5txpxgp7zrx7fexrdneyj4kzq2v4x5g3asx45m65cx7rgxu/0");
    }
}
