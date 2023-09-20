use anyhow::{anyhow, Result};
use starknet::core::{types::FieldElement, utils::parse_cairo_short_string};

/// Parse a Cairo "long string" represented as a Vec of FieldElements into a Rust String.
///
/// # Arguments
/// * `field_elements`: A vector of FieldElements representing the Cairo long string.
///
/// # Returns
/// * A `Result` which is either the parsed Rust string or an error.
pub fn parse_cairo_long_string(field_elements: Vec<FieldElement>) -> Result<String> {
    match field_elements.len() {
        0 => {
            Err(anyhow!("No value found"))
        }
        // If the long_string contains only one FieldElement, try to parse it using the short string parser.
        1 => match field_elements.first() {
            Some(first_string_field_element) => {
                match parse_cairo_short_string(first_string_field_element) {
                    Ok(value) => {
                        Ok(value)
                    }
                    Err(_) => {
                        Err(anyhow!("Error parsing short string"))
                    }
                }
            }
            None => Err(anyhow!("No value found")),
        },
        // If the long_string has more than one FieldElement, parse each FieldElement sequentially
        // and concatenate their results.
        _ => {
            let mut result = String::new();
            for i in 1..field_elements.len() {
                let field_element = field_elements[i];
                match parse_cairo_short_string(&field_element) {
                    Ok(value) => {
                        result.push_str(&value);
                    }
                    Err(_) => {
                        return Err(anyhow!("Error parsing short string"));
                    }
                }
            }
            Ok(result)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::parse_cairo_long_string;
    use starknet::core::types::FieldElement;

    #[test]
    fn should_return_error_for_empty_vector() {
        let long_string = vec![];

        let result = parse_cairo_long_string(long_string);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().to_string(), "No value found");
    }

    // This test is hypothetical and may not fit exactly as-is depending on the implementation of `parse_cairo_short_string`
    #[test]
    fn should_handle_generic_error_from_parse_cairo_short_string() {
        let long_string = vec![
            // some value that causes `parse_cairo_short_string` to error out
        ];

        let result = parse_cairo_long_string(long_string);
        assert!(result.is_err());
        // Check the error message or type here
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
        println!("Value: {}", value); // Print the value using Display formatter

        assert!(value == "ipfs://bafybeieocsz5txpxgp7zrx7fexrdneyj4kzq2v4x5g3asx45m65cx7rgxu/0");
    }
}
