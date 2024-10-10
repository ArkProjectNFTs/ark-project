use cainome::cairo_serde::U256;
use num_bigint::BigUint;

pub use starknet::core::utils::parse_cairo_short_string;

use std::fmt::LowerHex;

/// Returns the padded hex of '0x' prefixed
/// representation of the given felt.
/// TODO: can't use ark_starknet until starknet-rs conflict is resolved.
pub fn to_hex_str<T: LowerHex>(value: &T) -> String {
    format!("0x{:064x}", value)
}

pub fn to_hex_str_opt<T: LowerHex>(value: &Option<T>) -> Option<String> {
    value.as_ref().map(|v| format!("0x{:064x}", v))
}

pub fn u256_to_biguint(v: &U256) -> BigUint {
    let low_bytes = v.low.to_be_bytes();
    let high_bytes = v.high.to_be_bytes();

    let mut bytes: Vec<u8> = Vec::new();
    bytes.extend(high_bytes);
    bytes.extend(low_bytes);

    BigUint::from_bytes_be(&bytes[..])
}

pub fn u256_to_hex(value: &U256) -> String {
    to_hex_str(&u256_to_biguint(value))
}

pub fn u256_to_hex_opt(value: &Option<U256>) -> Option<String> {
    value.as_ref().map(|v| to_hex_str(&u256_to_biguint(v)))
}
