use cainome::rs::abigen;
use starknet::core::types::{EmittedEvent, Felt};

use super::{OrderbookParseError, ROLLBACK_STATUS_SELECTOR};

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
      "name": "RollbackStatus",
      "type": "ark_component::orderbook::orderbook::OrderbookComponent::RollbackStatus",
      "kind": "nested"
    }
  ]
},
    {
  "type": "event",
  "name": "ark_component::orderbook::orderbook::OrderbookComponent::RollbackStatus",
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
  ]
  "#,
  type_aliases {
    ark_component::orderbook::orderbook::OrderbookComponent::Event as EventV1;
    ark_component::orderbook::orderbook::OrderbookComponent::RollbackStatus as RollbackStatusV1;
    },
    derives(Debug),
);

#[derive(Debug)]
pub(crate) enum RollbackStatus {
    V1(RollbackStatusV1),
}

impl TryFrom<EmittedEvent> for RollbackStatus {
    type Error = OrderbookParseError;

    fn try_from(ev: EmittedEvent) -> Result<Self, Self::Error> {
        if ev.keys[0] == ROLLBACK_STATUS_SELECTOR {
            if ev.data.len() > 2 {
                let version = ev.data[0];
                if version == Felt::ONE {
                    match TryInto::<EventV1>::try_into(ev) {
                        Ok(event) => match event {
                            EventV1::RollbackStatus(ev) => return Ok(RollbackStatus::V1(ev)),
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
