use events::{
    OrderCancelled, OrderExecuted, OrderFulfilled, OrderPlaced, RollbackStatus,
    ORDER_CANCELLED_SELECTOR, ORDER_EXECUTED_SELECTOR, ORDER_FULFILLED_SELECTOR,
    ORDER_PLACED_SELECTOR,
};
use starknet::core::types::EmittedEvent;

pub mod events;

#[derive(Debug)]
pub enum Event {
    OrderPlaced(OrderPlaced),
    OrderExecuted(OrderExecuted),
    OrderCancelled(OrderCancelled),
    RollbackStatus(RollbackStatus),
    OrderFulfilled(OrderFulfilled),
    Unknown,
}

impl From<EmittedEvent> for Event {
    fn from(ev: EmittedEvent) -> Self {
        match ev.keys[0] {
            key if key == ORDER_CANCELLED_SELECTOR => match TryInto::<OrderCancelled>::try_into(ev)
            {
                Ok(ev) => Event::OrderCancelled(ev),
                Err(_) => Event::Unknown,
            },
            key if key == ORDER_EXECUTED_SELECTOR => match TryInto::<OrderExecuted>::try_into(ev) {
                Ok(ev) => Event::OrderExecuted(ev),
                Err(_) => Event::Unknown,
            },

            key if key == ORDER_FULFILLED_SELECTOR => match TryInto::<OrderFulfilled>::try_into(ev)
            {
                Ok(ev) => Event::OrderFulfilled(ev),
                Err(_) => Event::Unknown,
            },
            key if key == ORDER_PLACED_SELECTOR => match TryInto::<OrderPlaced>::try_into(ev) {
                Ok(ev) => Event::OrderPlaced(ev),
                Err(_) => Event::Unknown,
            },
            _ => Event::Unknown,
        }
    }
}

pub enum RouteType {
    Erc20ToErc721,
    Erc721ToErc20,
    Erc20ToErc1155,
    Erc1155ToErc20,
}

pub enum OrderType {
    Listing,
    Auction,
    Offer,
    CollectionOffer,
}

pub mod error {
    use starknet::core::types::Felt;

    pub const CANCELLED_USER: Felt = Felt::from_hex_unchecked("0x43414e43454c4c45445f55534552");
    pub const CANCELLED_BY_NEW_ORDER: Felt =
        Felt::from_hex_unchecked("0x43414e43454c4c45445f4e45575f4f52444552");
    pub const CANCELLED_ASSET_FAULT: Felt =
        Felt::from_hex_unchecked("0x43414e43454c4c45445f41535345545f4641554c54");
    pub const CANCELLED_OWNERSHIP: Felt =
        Felt::from_hex_unchecked("0x43414e43454c4c45445f4f574e455253484950");
}
