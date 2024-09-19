use events::{
    OrderCancelled, OrderExecuted, OrderFulfilled, OrderPlaced, RollbackStatus,
    ORDER_CANCELLED_SELECTOR, ORDER_EXECUTED_SELECTOR, ORDER_FULFILLED_SELECTOR,
    ORDER_PLACED_SELECTOR,
};
use starknet::core::types::EmittedEvent;

pub(crate) mod events;

#[derive(Debug)]
pub(crate) enum Event {
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
