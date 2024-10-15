use cainome::rs::abigen;
use starknet::core::types::{EmittedEvent, Felt};

use super::{OrderbookParseError, ORDER_FULFILLED_SELECTOR};

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
    "type": "event",
    "name": "ark_component::orderbook::orderbook::OrderbookComponent::Event",
    "kind": "enum",
    "variants": [
      {
        "name": "OrderFulfilled",
        "type": "ark_component::orderbook::orderbook::OrderbookComponent::OrderFulfilled",
        "kind": "nested"
      }
    ]
  },
    {
    "type": "event",
    "name": "ark_component::orderbook::orderbook::OrderbookComponent::OrderFulfilled",
    "kind": "struct",
    "members": [
      {
        "name": "order_hash",
        "type": "core::felt252",
        "kind": "key"
      },
      {
        "name": "fulfiller",
        "type": "core::starknet::contract_address::ContractAddress",
        "kind": "key"
      },
      {
        "name": "related_order_hash",
        "type": "core::option::Option::<core::felt252>",
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
      }
    ]
  }
    ]
  "#,
  type_aliases {
    ark_component::orderbook::orderbook::OrderbookComponent::Event as EventV1;
    ark_component::orderbook::orderbook::OrderbookComponent::OrderFulfilled as OrderFulfilledV1;
  },
  derives(Debug),
);

#[derive(Debug)]
pub enum OrderFulfilled {
    V1(OrderFulfilledV1),
}

impl TryFrom<EmittedEvent> for OrderFulfilled {
    type Error = OrderbookParseError;

    fn try_from(ev: EmittedEvent) -> Result<Self, Self::Error> {
        if ev.keys[0] == ORDER_FULFILLED_SELECTOR {
            if !ev.data.is_empty() {
                let version = ev.data[0];
                if version == Felt::ONE {
                    match TryInto::<EventV1>::try_into(ev) {
                        Ok(event) => match event {
                            EventV1::OrderFulfilled(ev) => return Ok(OrderFulfilled::V1(ev)),
                        },
                        Err(_) => return Err(OrderbookParseError::UnknownError),
                    };
                }
                Err(OrderbookParseError::UnsupportedVersion)
            } else {
                Err(OrderbookParseError::UnknownError)
            }
        } else {
            Err(OrderbookParseError::Selector)
        }
    }
}
