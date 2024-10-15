use cainome::rs::abigen;
use starknet::core::types::{EmittedEvent, Felt};

use super::{OrderbookParseError, ORDER_EXECUTED_SELECTOR};

abigen!(
    V0,
    r#"
    [
      {
    "type": "enum",
    "name": "ark_common::protocol::order_types::OrderStatus",
    "variants": [
      {
        "name": "Open",
        "type": "()"
      },
      {
        "name": "Fulfilled",
        "type": "()"
      },
      {
        "name": "Executed",
        "type": "()"
      },
      {
        "name": "CancelledUser",
        "type": "()"
      },
      {
        "name": "CancelledByNewOrder",
        "type": "()"
      },
      {
        "name": "CancelledAssetFault",
        "type": "()"
      },
      {
        "name": "CancelledOwnership",
        "type": "()"
      }
    ]
  },
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
      }
    ]
  }
  ]
  "#
  , type_aliases {
    ark_common::protocol::order_types::OrderStatus as OrderStatusV0;
    ark_orderbook::orderbook::orderbook::Event as EventV0;
    ark_orderbook::orderbook::orderbook::OrderExecuted as OrderExecutedV0;
  },
  derives(Debug)
);

abigen!(
  V1,
  r#"
  [
    {
  "type": "enum",
  "name": "ark_common::protocol::order_types::OrderStatus",
  "variants": [
    {
      "name": "Open",
      "type": "()"
    },
    {
      "name": "Fulfilled",
      "type": "()"
    },
    {
      "name": "Executed",
      "type": "()"
    },
    {
      "name": "CancelledUser",
      "type": "()"
    },
    {
      "name": "CancelledByNewOrder",
      "type": "()"
    },
    {
      "name": "CancelledAssetFault",
      "type": "()"
    },
    {
      "name": "CancelledOwnership",
      "type": "()"
    }
  ]
},
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
      "name": "OrderExecuted",
      "type": "ark_component::orderbook::orderbook::OrderbookComponent::OrderExecuted",
      "kind": "nested"
    }
  ]
},
{
  "type": "event",
  "name": "ark_component::orderbook::orderbook::OrderbookComponent::OrderExecuted",
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
  ark_common::protocol::order_types::OrderStatus as OrderStatusV1;
  ark_component::orderbook::orderbook::OrderbookComponent::Event as EventV1;
  ark_component::orderbook::orderbook::OrderbookComponent::OrderExecuted as OrderExecutedV1;
},
derives(Debug)
);

abigen!(
    V2,
    r#"
    [
      {
    "type": "enum",
    "name": "ark_common::protocol::order_types::OrderStatus",
    "variants": [
      {
        "name": "Open",
        "type": "()"
      },
      {
        "name": "Fulfilled",
        "type": "()"
      },
      {
        "name": "Executed",
        "type": "()"
      },
      {
        "name": "CancelledUser",
        "type": "()"
      },
      {
        "name": "CancelledByNewOrder",
        "type": "()"
      },
      {
        "name": "CancelledAssetFault",
        "type": "()"
      },
      {
        "name": "CancelledOwnership",
        "type": "()"
      }
    ]
  },
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
        "name": "OrderExecuted",
        "type": "ark_component::orderbook::orderbook::OrderbookComponent::OrderExecuted",
        "kind": "nested"
      }
    ]
  },
  {
    "type": "event",
    "name": "ark_component::orderbook::orderbook::OrderbookComponent::OrderExecuted",
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
    ark_common::protocol::order_types::OrderStatus as OrderStatusV2;
    ark_common::protocol::order_types::OrderType as OrderTypeV2;
    ark_component::orderbook::orderbook::OrderbookComponent::Event as EventV2;
    ark_component::orderbook::orderbook::OrderbookComponent::OrderExecuted as OrderExecutedV2;
  },
  derives(Debug)
);

#[derive(Debug)]
pub enum OrderExecuted {
    V0(OrderExecutedV0),
    V1(OrderExecutedV1),
    V2(OrderExecutedV2),
}

impl TryFrom<EmittedEvent> for OrderExecuted {
    type Error = OrderbookParseError;

    fn try_from(ev: EmittedEvent) -> Result<Self, Self::Error> {
        if ev.keys[0] == ORDER_EXECUTED_SELECTOR {
            if !ev.data.is_empty() {
                let version = ev.data[0];
                if version == Felt::ONE {
                    match TryInto::<EventV1>::try_into(ev) {
                        Ok(event) => match event {
                            EventV1::OrderExecuted(ev) => Ok(OrderExecuted::V1(ev)),
                        },
                        Err(_) => Err(OrderbookParseError::UnknownError),
                    }
                } else if version == Felt::TWO {
                    match TryInto::<EventV2>::try_into(ev) {
                        Ok(event) => match event {
                            EventV2::OrderExecuted(ev) => Ok(OrderExecuted::V2(ev)),
                        },
                        Err(_) => Err(OrderbookParseError::UnknownError),
                    }
                } else {
                    Err(OrderbookParseError::UnsupportedVersion)
                }
            } else {
                // version 0
                match TryInto::<EventV0>::try_into(ev) {
                    Ok(event) => match event {
                        EventV0::OrderExecuted(ev) => Ok(OrderExecuted::V0(ev)),
                    },
                    Err(_) => Err(OrderbookParseError::UnknownError),
                }
            }
        } else {
            Err(OrderbookParseError::Selector)
        }
    }
}
