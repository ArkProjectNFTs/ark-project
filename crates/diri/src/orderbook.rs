use cainome::rs::abigen;
use starknet::{
    core::types::{EmittedEvent, FieldElement},
    macros::selector,
};

// TODO: check a way to fix the path... because when compiled from
// ark-services, the path is not valid as it's relative to Cargo manifest file.
abigen!(
    Orderbook,
    "./artifacts/orderbook.abi.json",
    type_aliases {
      ark_orderbook::orderbook::orderbook::Event as EventV0;
      ark_orderbook::orderbook::orderbook::OrderExecuted as OrderExecutedV0;
    }
);

abigen!(
    OrderBook,
    r#"
    [
    {
      "type": "event",
          "name": "ark_orderbook::orderbook::orderbook::Event",
    "kind": "enum",
    "variants": [
      {
        "name": "OrderExecuted",
        "type": "ark_orderbook::orderbook::orderbook::OrderExecuted",
        "kind": "nested"
      }
      ]
    },
      {
    "type": "event",
    "name": "ark_orderbook::orderbook::orderbook::OrderExecuted",
    "kind": "struct",
    "members": [
      {
        "name": "order_hash",
        "type": "core::felt252",
        "kind": "key"
      },
      {
        "name": "order_status",
        "type": "ark_common::protocol::order_types::OrderStatus",
        "kind": "key"
      },
      {
        "name": "version",
        "type": "core::integer::u8",
        "kind": "data"
      },
      {
        "name": "transaction_hash",
        "type": "core::felt252",
        "kind": "data"
      },
      {
        "name": "from",
        "type": "core::starknet::contract_address::ContractAddress",
        "kind": "data"
      },
      {
        "name": "to",
        "type": "core::starknet::contract_address::ContractAddress",
        "kind": "data"
      }
    ]
  }
  ]
  "#
, type_aliases {
  ark_orderbook::orderbook::orderbook::Event as EventV1;
    ark_orderbook::orderbook::orderbook::OrderExecuted as OrderExecutedV1;
  }
);

#[derive(Debug)]
pub(crate) enum OrderExecuted {
    V0(OrderExecutedV0),
    V1(OrderExecutedV1),
}

#[derive(Debug)]
pub(crate) enum Event {
    OrderPlaced(OrderPlaced),
    OrderExecuted(OrderExecuted),
    OrderCancelled(OrderCancelled),
    RollbackStatus(RollbackStatus),
    OrderFulfilled(OrderFulfilled),
    Upgraded(Upgraded),
    Unknown,
}

impl From<EmittedEvent> for Event {
    fn from(ev: EmittedEvent) -> Self {
        if ev.keys[0] == selector!("OrderExecuted") {
            if ev.data.len() > 0 {
                let version = ev.data[0];
                if version == FieldElement::ONE {}
                // Version 1
                TryInto::<EventV1>::try_into(ev).unwrap().into()
            } else {
                // Version 0
                TryInto::<EventV0>::try_into(ev).unwrap().into()
            }
        } else {
            match TryInto::<EventV0>::try_into(ev) {
                Ok(ev) => ev.into(),
                Err(_) => Event::Unknown,
            }
        }
    }
}

impl From<EventV0> for Event {
    fn from(ev: EventV0) -> Self {
        match ev {
            EventV0::OrderCancelled(ev) => Event::OrderCancelled(ev),
            EventV0::OrderPlaced(ev) => Event::OrderPlaced(ev),
            EventV0::OrderFulfilled(ev) => Event::OrderFulfilled(ev),
            EventV0::RollbackStatus(ev) => Event::RollbackStatus(ev),
            EventV0::Upgraded(ev) => Event::Upgraded(ev),
            EventV0::OrderExecuted(ev) => Event::OrderExecuted(OrderExecuted::V0(ev)),
        }
    }
}

impl From<EventV1> for Event {
    fn from(ev: EventV1) -> Self {
        match ev {
            EventV1::OrderExecuted(ev) => Event::OrderExecuted(OrderExecuted::V1(ev)),
        }
    }
}
