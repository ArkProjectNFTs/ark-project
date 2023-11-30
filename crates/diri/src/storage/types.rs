use num_bigint::BigUint;

use starknet::core::types::FieldElement;
use std::fmt::LowerHex;

use crate::orderbook::{u256, OrderPlaced};

#[derive(Debug, Clone)]
pub struct NewOrderData {
    pub order_hash: String,
    pub order_version: String,
    pub order_type: String,
    pub cancelled_order_hash: Option<String>,
    // Order V1.
    pub route: String,
    pub currency_address: String,
    pub currency_chain_id: String,
    pub salt: String,
    pub offerer: String,
    pub token_chain_id: String,
    pub token_address: String,
    pub token_id: Option<String>,
    pub quantity: String,
    pub start_amount: String,
    pub end_amount: String,
    pub start_date: u64,
    pub end_date: u64,
    pub broker_id: String,
}

impl From<OrderPlaced> for NewOrderData {
    fn from(value: OrderPlaced) -> Self {
        Self {
            order_hash: to_hex_str(&value.order_hash),
            order_version: to_hex_str(&value.order_version),
            order_type: format!("{:?}", value.order_type),
            cancelled_order_hash: to_hex_str_opt(&value.cancelled_order_hash),

            route: format!("{:?}", value.order.route),
            currency_address: to_hex_str(&FieldElement::from(value.order.currency_address)),
            currency_chain_id: to_hex_str(&value.order.currency_chain_id),
            salt: to_hex_str(&value.order.salt),
            offerer: to_hex_str(&FieldElement::from(value.order.offerer)),
            token_chain_id: to_hex_str(&value.order.token_chain_id),
            token_address: to_hex_str(&FieldElement::from(value.order.token_address)),
            token_id: u256_to_hex_opt(&value.order.token_id),
            quantity: u256_to_hex(&value.order.quantity),
            start_amount: u256_to_hex(&value.order.start_amount),
            end_amount: u256_to_hex(&value.order.end_amount),
            start_date: value.order.start_date,
            end_date: value.order.end_date,
            broker_id: to_hex_str(&value.order.broker_id),
        }
    }
}

/// Returns the padded hex of '0x' prefixed
/// representation of the given felt.
/// TODO: can't use ark_starknet until starknet-rs conflict is resolved.
pub fn to_hex_str<T: LowerHex>(value: &T) -> String {
    format!("0x{:064x}", value)
}

pub fn to_hex_str_opt<T: LowerHex>(value: &Option<T>) -> Option<String> {
    value.as_ref().map(|v| format!("0x{:064x}", v))
}

pub fn u256_to_biguint(v: &u256) -> BigUint {
    let low_bytes = v.low.to_be_bytes();
    let high_bytes = v.high.to_be_bytes();

    let mut bytes: Vec<u8> = Vec::new();
    bytes.extend(high_bytes);
    bytes.extend(low_bytes);

    BigUint::from_bytes_be(&bytes[..])
}

pub fn u256_to_hex(value: &u256) -> String {
    to_hex_str(&u256_to_biguint(value))
}

pub fn u256_to_hex_opt(value: &Option<u256>) -> Option<String> {
    value.as_ref().map(|v| to_hex_str(&u256_to_biguint(v)))
}
