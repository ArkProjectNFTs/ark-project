use cainome::rs::abigen;
use starknet::core::{
    types::{EmittedEvent, Felt},
    utils::parse_cairo_short_string,
};

use crate::types::CancelledData;

use super::{common::to_hex_str, OrderbookParseError, ORDER_CANCELLED_SELECTOR};

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
        "name": "OrderCancelled",
        "type": "ark_component::orderbook::orderbook::OrderbookComponent::OrderCancelled",
        "kind": "nested"
      }
    ]
  },
      {
    "type": "event",
    "name": "ark_component::orderbook::orderbook::OrderbookComponent::OrderCancelled",
    "kind": "struct",
    "members": [
      {
        "name": "order_hash",
        "type": "core::felt252",
        "kind": "key"
      },
      {
        "name": "reason",
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
      }
    ]
  }
   ]"#,
  type_aliases {
    ark_component::orderbook::orderbook::OrderbookComponent::Event as EventV1;
    ark_component::orderbook::orderbook::OrderbookComponent::OrderCancelled as OrderCancelledV1;
  },
  derives(Debug),
);

#[derive(Debug)]
pub(crate) enum OrderCancelled {
    V1(OrderCancelledV1),
}

impl TryFrom<EmittedEvent> for OrderCancelled {
    type Error = OrderbookParseError;

    fn try_from(ev: EmittedEvent) -> Result<Self, Self::Error> {
        if ev.keys[0] == ORDER_CANCELLED_SELECTOR {
            if !ev.data.is_empty() {
                let version = ev.data[0];
                if version == Felt::ONE {
                    match TryInto::<EventV1>::try_into(ev) {
                        Ok(event) => match event {
                            EventV1::OrderCancelled(ev) => return Ok(OrderCancelled::V1(ev)),
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
