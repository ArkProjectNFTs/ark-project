//! Orderbook logic.
//!
//! The orderbook accepts orders from know brokers
//! and validatae them before they can be registered.
//!
//! The sequencer (solis) is responsible for checking
//! the starknet state of the assets before actually
//! let the transaction goes in.
//!
//! The orderbook uses the send messages built-in
//! to fire a transaction on starknet to execute orders.
//! Once executed, starknet will emit an event that will be
//! forwared by solis to finalize the order.
//!
//! TODO: RENAME the functions for more consistency.
use arkchain::order::{OrderListing, OrderBuy};

#[starknet::interface]
trait IOrderbook<T> {
    /// Registers a new broker. Necessary to be able to receive
    /// orders as only registered broker can send orders.
    fn register_broker(ref self: T, name: felt252, public_key: felt252, chain_id: felt252);

    /// Add a listing order to the database.
    fn add_order_listing(ref self: T, order: OrderListing);

    /// Submit a buy for the given order.
    fn submit_order_buy(ref self: T, order: OrderBuy);
}

/// Orderbook contract.
#[starknet::contract]
mod orderbook {
    use arkchain::broker::Broker;
    use arkchain::order::{
        OrderListing, OrderBuy, OrderStatus, OrderBuyExecute,
        compute_order_hash};
    use arkchain::order_db::{
        order_read, order_write,
        order_status_read, order_status_write
    };
    use starknet::{ContractAddress, ClassHash, SyscallResultTrait};

    use super::IOrderbook;

    use debug::PrintTrait;

    #[storage]
    struct Storage {
        // orders -> go voir order_db.
        owner: ContractAddress,
        // chain_id <> allowed or not.
        chains: LegacyMap::<felt252, bool>,
        // broker_name <> Broker.
        brokers: LegacyMap::<felt252, Broker>,
        // Executor address on Starknet.
        executor_address: ContractAddress,
        // Tokens in listing: (chain_id, collection, token_id) <> order hash.
        tokens_listing: LegacyMap::<(felt252, ContractAddress, u256), felt252>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        BrokerRegistered: BrokerRegistered,
        OrderListingAdded: OrderListingAdded,
        OrderBuyExecuting: OrderBuyExecuting,
        OrderBuyFinalized: OrderBuyFinalized,
        Upgraded: Upgraded,
    }

    #[derive(Drop, starknet::Event)]
    struct BrokerRegistered {
        #[key]
        name: felt252,
        #[key]
        chain_id: felt252,
        // data
        timestamp: u64,
        public_key: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct OrderListingAdded {
        #[key]
        hash: felt252,
        #[key]
        broker_name: felt252,
        #[key]
        chain_id: felt252,
        // data
        timestamp: u64,
        seller: ContractAddress,
        collection: ContractAddress,
        token_id: u256,
        price: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct OrderBuyExecuting {
        #[key]
        hash: felt252,
        #[key]
        broker_name: felt252,
        #[key]
        chain_id: felt252,
        // data
        timestamp: u64,
        seller: ContractAddress,
        buyer: ContractAddress,
        collection: ContractAddress,
        token_id: u256,
        price: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct OrderBuyFinalized {
        #[key]
        hash: felt252,
        // data
        timestamp: u64,
        seller: ContractAddress,
        buyer: ContractAddress,
        collection: ContractAddress,
        token_id: u256,
        price: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Upgraded {
        #[key]
        class_hash: ClassHash,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
        self.chains.write('starknet_testnet', true);
    }

    #[external(v0)]
    fn set_executor_sn_address(ref self: ContractState, executor: ContractAddress) {
        self.executor_address.write(executor);
    }

    /// Can only be called on a message received from Starknet.
    #[l1_handler]
    fn finalize_order_buy(ref self: ContractState, from_address: felt252, order_hash: felt252, buyer: ContractAddress) {
        assert(from_address == self.executor_address.read().into(), 'Bad executor');

        let tup: (Option<OrderStatus>, Option<OrderListing>) = order_read::<OrderListing>(order_hash);

        let (status, order) = tup;

        if order.is_none() {
            panic_with_felt252('Order must exist');
        }

        let order = order.unwrap();

        // TODO: check if we need double check here. It should not be necessary.
        let broker = self.brokers.read(order.broker_name);

        if status.is_none() {
            panic_with_felt252('Order does not exist');
        }

        match status.unwrap() {
            OrderStatus::Open => panic_with_felt252('Order bad open status'),
            OrderStatus::Executing => {
                if !order_status_write(order_hash, OrderStatus::Finalized) {
                    panic_with_felt252('Couldnt finalize the order')
                }

                // Ensure the token is not considered as listed.
                self.tokens_listing.write(
                    (broker.chain_id, order.collection, order.token_id),
                    0
                );

                self.emit(OrderBuyFinalized {
                    hash: order_hash,
                    timestamp: starknet::get_block_timestamp(),
                    seller: order.seller,
                    buyer,
                    collection: order.collection,
                    token_id: order.token_id,
                    price: order.price,
                });
            },
            OrderStatus::Finalized => panic_with_felt252('Order already finalized'),
            OrderStatus::Cancelled => panic_with_felt252('Order already cancelled'),
        }
    }

    #[external(v0)]
    fn upgrade(ref self: ContractState, class_hash: ClassHash) {
        assert(
            starknet::get_caller_address() == self.owner.read(),
            'Unauthorized replace class'
        );

        match starknet::replace_class_syscall(class_hash) {
            Result::Ok(_) => self.emit(Upgraded { class_hash }),
            Result::Err(revert_reason) => panic(revert_reason),
        };
    }

    #[external(v0)]
    impl OrderbookImpl of IOrderbook<ContractState> {
        fn register_broker(
            ref self: ContractState,
            name: felt252,
            public_key: felt252,
            chain_id: felt252
        ) {
            // TODO: add pre-validation of the broker.
            assert(self.chains.read(chain_id), 'Invalid chain id');
            assert(name != 0, 'Invalid broker name');
            assert(!_is_broker_registered(@self, name), 'Broker already registered');

            self.brokers.write(name, Broker {
                name,
                public_key,
                chain_id,
            });

            self.emit(BrokerRegistered {
                name,
                chain_id,
                timestamp: starknet::info::get_block_timestamp(),
                public_key,
            });
        }

        fn add_order_listing(ref self: ContractState, order: OrderListing) {
            let b = self.brokers.read(order.broker_name);
            if b.name != order.broker_name {
                panic_with_felt252('Broker not registered');
            }

            // TODO: verify signature.

            let hash = compute_order_hash(order);
            
            let status = order_status_read(hash);
            if status.is_some() {
                panic_with_felt252('Order already registered');
            }

            assert(self.tokens_listing.read((b.chain_id, order.collection, order.token_id))
                   == 0,
                   'Token already listed');

            order_write(hash, order);

            self.tokens_listing.write((b.chain_id, order.collection, order.token_id), hash);

            self.emit(OrderListingAdded {
                hash,
                broker_name: b.name,
                chain_id: b.chain_id,
                timestamp: starknet::info::get_block_timestamp(),
                seller: order.seller,
                collection: order.collection,
                token_id: order.token_id,
                price: order.price,
            });
        }

        fn submit_order_buy(ref self: ContractState, order: OrderBuy) {
            let b = self.brokers.read(order.broker_name);
            if b.name != order.broker_name {
                panic_with_felt252('Broker not registered');
            }

            let tup: (Option<OrderStatus>, Option<OrderListing>)
                = order_read::<OrderListing>(order.order_listing_hash);

            let (status, listing_order) = tup;

            if listing_order.is_none() {
                panic_with_felt252('Order must exist 1');
            }

            let order_l: OrderListing = listing_order.expect('expected order listing');

            match status {
                Option::Some(status) => {
                    if status != OrderStatus::Open {
                        panic_with_felt252('Order must be open');
                    }
                },
                Option::None => panic_with_felt252('Order must exist 2'),
            }

            let exec = OrderBuyExecute {
                order_hash: order.order_listing_hash,
                nft_address: order_l.collection,
                token_id: order_l.token_id,
                maker_address: order_l.seller,
                taker_address: order.buyer,
                price: order_l.price,
            };

            let mut buf = array![];
            exec.serialize(ref buf);

            // Need here to start with 0 the address. This will make
            // katana to fire directly a tx decoding the payload.
            let mut payload = array![
                self.executor_address.read().into(),
                // Selector for execute_buy_order.
                0x024c7997a5fbca75042a8d71d2eb9dd8d689a466ceb2d0cb0d4d36821b6e7470,
            ];

            // Need to then add the payload to the address and selector.
            loop {
                match buf.pop_front() {
                    Option::Some(v) => {
                        payload.append(v);
                    },
                    Option::None(_) => {
                        break ();
                    },
                };
            };

            starknet::send_message_to_l1_syscall(
                0,
                payload.span(),
            ).unwrap_syscall();

            if !order_status_write(order.order_listing_hash, OrderStatus::Executing) {
                panic_with_felt252('Could write status');
            }

            self.emit(OrderBuyExecuting {
                hash: order.order_listing_hash,
                broker_name: b.name,
                chain_id: b.chain_id,
                timestamp: starknet::get_block_timestamp(),
                buyer: order.buyer,
                seller: order_l.seller,
                collection: order_l.collection,
                token_id: order_l.token_id,
                price: order_l.price,
            });
        }
    }

    fn _is_broker_registered(self: @ContractState, name: felt252) -> bool {
        self.brokers.read(name).name == name
    }
}
