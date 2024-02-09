pub mod client;
pub mod format;
use anyhow::Result;
use format::to_hex_str;
use num_bigint::BigUint;
use num_traits::Num;
use starknet::core::types::EmittedEvent;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct CairoU256 {
    pub low: u128,
    pub high: u128,
}

#[derive(Debug, Clone)]
pub struct EventResult {
    pub events: HashMap<u64, Vec<EmittedEvent>>,
    pub continuation_token: Option<String>,
}

impl CairoU256 {
    pub fn to_biguint(&self) -> BigUint {
        let low_bytes = self.low.to_be_bytes();
        let high_bytes = self.high.to_be_bytes();

        let mut bytes: Vec<u8> = Vec::new();
        bytes.extend(high_bytes);
        bytes.extend(low_bytes);

        BigUint::from_bytes_be(&bytes[..])
    }

    pub fn to_hex(&self) -> String {
        let token_id_big_uint = self.to_biguint();
        to_hex_str(&token_id_big_uint)
    }

    pub fn to_decimal(&self, padded: bool) -> String {
        let token_id_big_uint = self.to_biguint();
        let token_id_str: String = token_id_big_uint.to_str_radix(10);

        if padded {
            format!("{:0>width$}", token_id_str, width = 78)
        } else {
            token_id_str
        }
    }

    pub fn from_hex_be(value: &str) -> Result<Self> {
        // Remove the "0x" prefix if it exists
        let value = value.strip_prefix("0x").unwrap_or(value);

        // Parse the hexadecimal string into a BigUint
        let biguint = match BigUint::from_str_radix(value, 16) {
            Ok(b) => b,
            Err(_) => return Err(anyhow::anyhow!("Invalid hexadecimal string")),
        };

        // Convert the BigUint to a 32-byte buffer
        let mut bytes = biguint.to_bytes_be();
        let padding = vec![0; 32 - bytes.len()];
        bytes.splice(0..0, padding);

        // Split the input array into two parts
        let (high, low) = bytes.split_at(16);

        let low = u128::from_be_bytes(low.try_into()?);
        let high = u128::from_be_bytes(high.try_into()?);

        Ok(Self { low, high })
    }
}

#[cfg(test)]
mod tests {
    use num_traits::Num;

    use super::*;

    #[test]
    fn test_to_biguint() {
        let u256 = CairoU256 { low: 15, high: 0 };

        let result = u256.to_biguint();
        assert_eq!(result, BigUint::from_str_radix("15", 10).unwrap());
    }

    #[test]
    fn test_to_hex() {
        let u256 = CairoU256 { low: 15, high: 0 };

        let expected_hex = "0x000000000000000000000000000000000000000000000000000000000000000f";
        let result = u256.to_hex();
        assert_eq!(result, expected_hex);
    }

    #[test]
    fn test_to_decimal() {
        let u256 = CairoU256 { low: 15, high: 0 };

        let expected_decimal = "15";
        let result = u256.to_decimal(false);
        assert_eq!(result, expected_decimal);

        let expected_padded_decimal =
            "000000000000000000000000000000000000000000000000000000000000000000000000000015";
        let result_padded = u256.to_decimal(true);
        assert_eq!(result_padded, expected_padded_decimal);
    }

    #[test]
    fn test_from_hex_be() {
        let hex_string = "0x000000000000000000000000000000000000000000000000000000000000000f";
        let u256 = CairoU256::from_hex_be(hex_string).unwrap();

        assert_eq!(u256.low, 15);
        assert_eq!(u256.high, 0);

        // Test with invalid hex string
        let invalid_hex_string = "invalidhex";
        assert!(CairoU256::from_hex_be(invalid_hex_string).is_err());

        let hex_string = "0x05f7cd1fd465baff2ba9d2d1501ad0a2eb5337d9a885be319366b5205a414fdd";
        let u256 = CairoU256::from_hex_be(hex_string).unwrap();

        assert_eq!(
            u256.low,
            u128::from_str_radix("eb5337d9a885be319366b5205a414fdd", 16).unwrap()
        );
        assert_eq!(
            u256.high,
            u128::from_str_radix("05f7cd1fd465baff2ba9d2d1501ad0a2", 16).unwrap()
        );
    }
}
