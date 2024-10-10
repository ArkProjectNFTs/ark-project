use orderbook::events::{
    common::{to_hex_str, to_hex_str_opt, u256_to_hex, u256_to_hex_opt},
    OrderCancelled, OrderExecuted, OrderFulfilled, OrderPlaced, RollbackStatus,
};
use starknet::core::{types::Felt, utils::parse_cairo_short_string};

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

#[derive(Debug, Clone)]
pub struct RollbackStatusData {
    pub order_hash: String,
    pub order_type: String,
    pub reason: String,
}

#[derive(Debug, Clone)]
pub struct FulfilledData {
    pub order_hash: String,
    pub order_type: String,
    pub fulfiller: String,
    pub related_order_hash: Option<String>,
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

impl From<OrderPlaced> for PlacedData {
    fn from(value: OrderPlaced) -> Self {
        match value {
            OrderPlaced::V1(value) => Self {
                order_hash: to_hex_str(&value.order_hash),
                order_version: to_hex_str(&value.order_version),
                order_type: format!("{:?}", value.order_type),
                cancelled_order_hash: to_hex_str_opt(&value.cancelled_order_hash),
                route: format!("{:?}", value.order.route),
                currency_address: to_hex_str(&Felt::from(value.order.currency_address)),
                currency_chain_id: to_hex_str(&value.order.currency_chain_id),
                salt: to_hex_str(&value.order.salt),
                offerer: to_hex_str(&Felt::from(value.order.offerer)),
                token_chain_id: format!("0x{:x}", value.order.token_chain_id),
                token_address: to_hex_str(&Felt::from(value.order.token_address)),
                token_id: u256_to_hex_opt(&value.order.token_id),
                quantity: u256_to_hex(&value.order.quantity),
                start_amount: u256_to_hex(&value.order.start_amount),
                end_amount: u256_to_hex(&value.order.end_amount),
                start_date: value.order.start_date,
                end_date: value.order.end_date,
                broker_id: to_hex_str(&Felt::from(value.order.broker_id)),
            },
        }
    }
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
