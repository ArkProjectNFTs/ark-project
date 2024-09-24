use cainome::rs::abigen;
use starknet::core::types::{EmittedEvent, Felt};

use crate::types::PlacedData;

use super::{
    common::{to_hex_str, to_hex_str_opt, u256_to_hex, u256_to_hex_opt},
    OrderbookParseError, ORDER_PLACED_SELECTOR,
};

abigen!(
    V1,
    r#"
    [
      {
    "type": "enum",
    "name": "ark_common::protocol::order_types::OrderType",
    "variants": [
      {
        "name": "Listing",
        "type": "()"
      },
      {
        "name": "Auction",
        "type": "()"
      },
      {
        "name": "Offer",
        "type": "()"
      },
      {
        "name": "CollectionOffer",
        "type": "()"
      }
    ]
  },
    {
    "type": "enum",
    "name": "ark_common::protocol::order_types::RouteType",
    "variants": [
      {
        "name": "Erc20ToErc721",
        "type": "()"
      },
      {
        "name": "Erc721ToErc20",
        "type": "()"
      }
    ]
  },
  {
    "type": "struct",
    "name": "ark_common::protocol::order_v1::OrderV1",
    "members": [
      {
        "name": "route",
        "type": "ark_common::protocol::order_types::RouteType"
      },
      {
        "name": "currency_address",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "currency_chain_id",
        "type": "core::felt252"
      },
      {
        "name": "salt",
        "type": "core::felt252"
      },
      {
        "name": "offerer",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "token_chain_id",
        "type": "core::felt252"
      },
      {
        "name": "token_address",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "token_id",
        "type": "core::option::Option::<core::integer::u256>"
      },
      {
        "name": "quantity",
        "type": "core::integer::u256"
      },
      {
        "name": "start_amount",
        "type": "core::integer::u256"
      },
      {
        "name": "end_amount",
        "type": "core::integer::u256"
      },
      {
        "name": "start_date",
        "type": "core::integer::u64"
      },
      {
        "name": "end_date",
        "type": "core::integer::u64"
      },
      {
        "name": "broker_id",
        "type": "core::starknet::contract_address::ContractAddress"
      },
      {
        "name": "additional_data",
        "type": "core::array::Span::<core::felt252>"
      }
    ]
  },

      {
    "type": "event",
    "name": "ark_component::orderbook::orderbook::OrderbookComponent::Event",
    "kind": "enum",
    "variants": [
      {
        "name": "OrderPlaced",
        "type": "ark_component::orderbook::orderbook::OrderbookComponent::OrderPlaced",
        "kind": "nested"
      }
    ]
  },
      {
    "type": "event",
    "name": "ark_component::orderbook::orderbook::OrderbookComponent::OrderPlaced",
    "kind": "struct",
    "members": [
      {
        "name": "order_hash",
        "type": "core::felt252",
        "kind": "key"
      },
      {
        "name": "order_version",
        "type": "core::felt252",
        "kind": "key"
      },
      {
        "name": "order_type",
        "type": "ark_common::protocol::order_types::OrderType",
        "kind": "key"
      },
      {
        "name": "version",
        "type": "core::integer::u8",
        "kind": "data"
      },
      {
        "name": "cancelled_order_hash",
        "type": "core::option::Option::<core::felt252>",
        "kind": "data"
      },
      {
        "name": "order",
        "type": "ark_common::protocol::order_v1::OrderV1",
        "kind": "data"
      }
    ]
  }
    ]
    "#,
    type_aliases {
      ark_component::orderbook::orderbook::OrderbookComponent::Event as EventV1;
      ark_component::orderbook::orderbook::OrderbookComponent::OrderPlaced as OrderPlacedV1;
      },
      derives(Debug),
);

#[derive(Debug)]
pub(crate) enum OrderPlaced {
    V1(OrderPlacedV1),
}

impl TryFrom<EmittedEvent> for OrderPlaced {
    type Error = OrderbookParseError;

    fn try_from(ev: EmittedEvent) -> Result<Self, Self::Error> {
        if ev.keys[0] == ORDER_PLACED_SELECTOR {
            if ev.data.len() > 2 {
                let version = ev.data[0];
                if version == Felt::ONE {
                    match TryInto::<EventV1>::try_into(ev) {
                        Ok(event) => match event {
                            EventV1::OrderPlaced(ev) => return Ok(OrderPlaced::V1(ev)),
                        },
                        Err(_) => return Err(OrderbookParseError::UnknownError),
                    }
                }
                Err(OrderbookParseError::UnsupportedVersion)
            } else {
                // Old version
                Err(OrderbookParseError::UnknownError)
            }
        } else {
            Err(OrderbookParseError::Selector)
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
