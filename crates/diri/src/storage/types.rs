use num_bigint::BigUint;

use starknet::core::types::Felt;
use starknet::core::utils::parse_cairo_short_string;
use std::fmt::LowerHex;

use crate::orderbook::events::{
    OrderCancelled, OrderExecuted, OrderFulfilled, RollbackStatus, U256,
};

#[derive(Debug, Clone)]
pub struct PlacedData {
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

#[derive(Debug, Clone)]
pub struct CancelledData {
    pub order_hash: String,
    pub order_type: String,
    pub reason: String,
}

impl From<OrderCancelled> for CancelledData {
    fn from(value: OrderCancelled) -> Self {
        match value {
            OrderCancelled::V1(value) => Self {
                order_hash: to_hex_str(&value.order_hash),
                order_type: format!("{:?}", value.order_type),
                reason: parse_cairo_short_string(&value.reason)
                    .unwrap_or(to_hex_str(&value.reason)),
            },
        }
    }
}

#[derive(Debug, Clone)]
pub struct RollbackStatusData {
    pub order_hash: String,
    pub order_type: String,
    pub reason: String,
}

impl From<RollbackStatus> for RollbackStatusData {
    fn from(value: RollbackStatus) -> Self {
        match value {
            RollbackStatus::V1(value) => Self {
                order_hash: to_hex_str(&value.order_hash),
                order_type: format!("{:?}", value.order_type),
                reason: parse_cairo_short_string(&value.reason)
                    .unwrap_or(to_hex_str(&value.reason)),
            },
        }
    }
}

#[derive(Debug, Clone)]
pub struct FulfilledData {
    pub order_hash: String,
    pub order_type: String,
    pub fulfiller: String,
    pub related_order_hash: Option<String>,
}

impl From<OrderFulfilled> for FulfilledData {
    fn from(value: OrderFulfilled) -> Self {
        match value {
            OrderFulfilled::V1(value) => {
                let related_order_hash = value.related_order_hash.map(Felt::from);

                Self {
                    order_hash: to_hex_str(&value.order_hash),
                    order_type: format!("{:?}", value.order_type),
                    fulfiller: to_hex_str(&Felt::from(value.fulfiller)),
                    related_order_hash: to_hex_str_opt(&related_order_hash),
                }
            }
        }
    }
}

#[derive(Debug, Clone)]
pub struct ExecutedData {
    pub version: u8,
    pub order_hash: String,
    pub order_type: Option<String>,
    pub transaction_hash: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
}

impl From<OrderExecuted> for ExecutedData {
    fn from(value: OrderExecuted) -> Self {
        match value {
            OrderExecuted::V0(v) => Self {
                version: 0,
                order_hash: to_hex_str(&v.order_hash),
                order_type: None,
                transaction_hash: None,
                from: None,
                to: None,
            },
            OrderExecuted::V1(v) => Self {
                version: 1,
                order_hash: to_hex_str(&v.order_hash),
                order_type: None,
                transaction_hash: Some(to_hex_str(&v.transaction_hash)),
                from: Some(to_hex_str(&Felt::from(v.from))),
                to: Some(to_hex_str(&Felt::from(v.to))),
            },
            OrderExecuted::V2(v) => Self {
                version: 2,
                order_hash: to_hex_str(&v.order_hash),
                order_type: Some(format!("{:?}", v.order_type)),
                transaction_hash: Some(to_hex_str(&v.transaction_hash)),
                from: Some(to_hex_str(&Felt::from(v.from))),
                to: Some(to_hex_str(&Felt::from(v.to))),
            },
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
