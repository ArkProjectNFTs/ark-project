//! Orderbook contract.
//!
use arkchain::order::order_v1::OrderV1;
use arkchain::crypto::signer::SignInfo;

#[starknet::interface]
trait Orderbook<T> {
    /// Whitelists a broker.
    /// TODO: good first exercise to use a components for broker managment.
    ///
    /// # Arguments
    ///
    /// * `broker_id` - ID of the broker.
    fn whitelist_broker(ref self: T, broker_id: felt252);

    /// Submits and places an order to the orderbook if the order is valid.
    ///
    /// # Arguments
    ///
    /// * `order` - The order to be placed.
    /// * `sign_info` - The signing info of the `order`.
    fn place_order(ref self: T, order: OrderV1, sign_info: SignInfo);
}

mod orderbook_errors {
    const BROKER_UNREGISTERED: felt252 = 'OB: unregistered broker';

    const ORDER_INVALID_DATA: felt252 = 'OB: order invalid data';
}

#[starknet::contract]
mod orderbook {
    use super::{orderbook_errors, Orderbook};

    use starknet::ContractAddress;

    use arkchain::order::types::OrderTrait;
    use arkchain::order::order_v1::OrderV1;
    use arkchain::crypto::signer::SignInfo;

    #[storage]
    struct Storage {
        // Administrator of the orderbook.
        admin: ContractAddress,
        // Whitelist of brokers. For now felt252 is used instead of bool
        // to ensure future evolution. Set to 1 if the broker is registered.
        brokers: LegacyMap<felt252, felt252>
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        OrderPlaced: OrderPlaced,
    }

    #[derive(Drop, starknet::Event)]
    struct OrderPlaced {
        #[key]
        order_hash: felt252,
        #[key]
        order_version: felt252,
        // The full order serialized.
        order: Span<felt252>,
        // TO BE DEFINED?.
    }

    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.admin.write(admin);
    }

    #[external(v0)]
    impl ImplOrderbook of Orderbook<ContractState> {
        fn whitelist_broker(ref self: ContractState, broker_id: felt252) {
            // TODO: check components with OZ when ready for ownable.
            assert(self.admin.read() == starknet::get_caller_address(),
                   orderbook_errors::BROKER_UNREGISTERED);

            self.brokers.write(broker_id, 1);
        }

        fn place_order(ref self: ContractState, order: OrderV1, sign_info: SignInfo) {
            order.validate_common_data().expect(orderbook_errors::ORDER_INVALID_DATA);

            let order_type = order.validate_order_type().expect(orderbook_errors::ORDER_INVALID_DATA);

            // TODO:
            // 1. based on order type -> validate the storage (match order_type -> call a
            // function to validate each cases).
            // (if the order can be placed, if it triggers the cancel of other order, etc..)

            // 4. register the order in the storage (can be multiple storage item to update).

            // 5. Emit an event.
        }
    }
}
