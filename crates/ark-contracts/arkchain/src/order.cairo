//! Order related data.
//!
//! The order is living inside the `order_db` storage.
//! But we also expose the order by events, used for indexing.
//! Any change in the order definition must be carefully propagated
//! to the corresponding part of the project.
use starknet::ContractAddress;

/// Status of an order, that may be defined from
/// incoming transactions or messages from Starknet.
#[derive(starknet::Store, Serde, Drop, PartialEq)]
enum OrderStatus {
    Open,
    Executing,
    Finalized,
    Cancelled,
}

impl OrderStatusIntoFelt252 of Into<OrderStatus, felt252> {
    fn into(self: OrderStatus) -> felt252 {
        match self {
            OrderStatus::Open => 'OPEN',
            OrderStatus::Executing => 'EXECUTING',
            OrderStatus::Finalized => 'FINALIZED',
            OrderStatus::Cancelled => 'CANCELLED',
        }
    }
}

impl Felt252TryIntoOrderStatus of TryInto<felt252, OrderStatus> {
    fn try_into(self: felt252) -> Option<OrderStatus> {
        if self == 'OPEN' {
            Option::Some(OrderStatus::Open)
        } else if self == 'EXECUTING' {
            Option::Some(OrderStatus::Executing)
        } else if self == 'FINALIZED' {
            Option::Some(OrderStatus::Finalized)
        } else if self == 'CANCELLED' {
            Option::Some(OrderStatus::Cancelled)
        } else {
            Option::None
        }
    }
}

#[derive(starknet::Store, Serde, Copy, Drop)]
struct OrderListing {
    seller: ContractAddress,
    collection: ContractAddress,
    token_id: u256,
    // Price in wei.
    price: u256,
    // Seconds since unix epoch. 0 means no expiry.
    end_date: felt252,
    // Broker footprint.
    broker_name: felt252,
    // Broker signature is computed on all fields above.
    broker_sig_r: felt252,
    broker_sig_s: felt252,
}

#[derive(starknet::Store, Serde, Copy, Drop)]
struct OrderBuy {
    order_listing_hash: felt252,
    buyer: ContractAddress,
    // Broker footprint.
    broker_name: felt252,
    // Broker signature is computed on all fields above.
    broker_sig_r: felt252,
    broker_sig_s: felt252,
}

// TODO: make a common crate with starknet scarb package.
// But starknet foundry is not supported workspaces now.
#[derive(Drop, Serde)]
struct OrderBuyExecute {
    order_hash: felt252,
    nft_address: ContractAddress,
    token_id: u256,
    maker_address: ContractAddress,
    taker_address: ContractAddress,
    price: u256
}

/// Computes an order hash.
fn compute_order_hash<T, impl TSerde: Serde<T>, impl TDrop: Drop<T>>(order: T) -> felt252 {
    let mut buf = array![];
    order.serialize(ref buf);
    starknet_keccak(buf.span())
}

/// Computes the starknet keccak on the input data.
/// Starknet keccak is used to fit into one felt.
fn starknet_keccak(data: Span<felt252>) -> felt252 {
    let mut u256_data: Array<u256> = array![];

    let mut i = 0_usize;
    loop {
        if i == data.len() {
            break;
        }
        u256_data.append((*data[i]).into());
        i += 1;
    };

    let mut hash = keccak::keccak_u256s_be_inputs(u256_data.span());
    let low = integer::u128_byte_reverse(hash.high);
    let high = integer::u128_byte_reverse(hash.low);
    hash = u256 { low, high };
    hash = hash & 0x03ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff_u256;
    hash.try_into().expect('starknet keccak overflow')
}
