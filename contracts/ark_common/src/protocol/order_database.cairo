use core::result::ResultTrait;
//! Orders database.
//!
//! The order database uses the `storage_read` and `storage_write`
//! syscalls directly to optimize how data are stored.
//!
//! The status is always stored independently of the seriliazed
//! order. This allows a quick and cheap storage/retrieval of the status
//! without having to write/read the whole order.
//!
//! The only assumption for now is that,
//! a single order serialized buffer must not exceed
//! 256 felts.
//!
//! The storage layout is the following:
//!
//! 1. Compute the storage base address with [ORDER_DB_BASE_KEY, order_hash]
//! 2. At base address + offset 0 => The order status.
//! 3. At base address + offset 1 => The length of the serialized order.
//! 4. At base addresss + offset 2 => First felt of the serialized order.
use starknet::SyscallResultTrait;

use ark_common::protocol::order_types::OrderStatus;
use ark_common::protocol::order_types::OrderType;

/// Must remain equal to 0 for now.
const ADDRESS_DOMAIN: u32 = 0;
/// A constant value used in the base key hash.
const ORDER_DB_BASE_KEY: felt252 = 'order database';

/// Reads an order from the database from the storage.
///
/// # Arguments
///
/// * `order_hash` - Hash of the order used as key.
fn order_read<T, impl TSerde: Serde<T>, impl TDrop: Drop<T>>(order_hash: felt252) -> Option<T> {
    let key = array![ORDER_DB_BASE_KEY, order_hash];

    let base = starknet::storage_base_address_from_felt252(
        poseidon::poseidon_hash_span(key.span())
    );

    // Then, we must read the length to deserialize the data.
    let length: felt252 = starknet::storage_read_syscall(
        ADDRESS_DOMAIN, starknet::storage_address_from_base_and_offset(base, 2)
    ).unwrap_syscall();

    if length == 0 {
        return Option::None;
    }

    let mut offset = 3;
    let mut value = array![];

    loop {
        if offset.into() == length + 3 {
            break ();
        }
        let v = starknet::storage_read_syscall(
            ADDRESS_DOMAIN, starknet::storage_address_from_base_and_offset(base, offset)
        ).unwrap_syscall();

        value.append(v);

        offset += 1;
    };

    let mut vspan = value.span();
    let order = match Serde::<T>::deserialize(ref vspan) {
        Option::Some(o) => o,
        Option::None => { return Option::None; },
    };

    Option::Some(order)
}

/// Writes an order into the database (storage), with the status "Open".
///
/// # Arguments
///
/// * `order_hash` - Hash of the order used as key.
/// * `order` - An order structure that must be serializable.
fn order_write<T, impl TSerde: Serde<T>, impl TDrop: Drop<T>>(
    order_hash: felt252, order_type: OrderType, order: T
) {
    let key = array![ORDER_DB_BASE_KEY, order_hash];

    let base = starknet::storage_base_address_from_felt252(
        poseidon::poseidon_hash_span(key.span())
    );

    // At offset 0, we have the status.
    starknet::storage_write_syscall(
        ADDRESS_DOMAIN,
        starknet::storage_address_from_base_and_offset(base, 0),
        OrderStatus::Open.into()
    );

    // At offset 1, we always have the order type.
    starknet::storage_write_syscall(
        ADDRESS_DOMAIN, starknet::storage_address_from_base_and_offset(base, 1), order_type.into()
    );

    // At offset 1, we always have the length.
    let mut buf = array![];
    order.serialize(ref buf);

    starknet::storage_write_syscall(
        ADDRESS_DOMAIN, starknet::storage_address_from_base_and_offset(base, 2), buf.len().into()
    );

    let mut offset = 3;

    loop {
        match buf.pop_front() {
            Option::Some(v) => {
                starknet::storage_write_syscall(
                    ADDRESS_DOMAIN, starknet::storage_address_from_base_and_offset(base, offset), v
                );
                offset += 1
            },
            Option::None(_) => { break (); },
        };
    };
}

fn order_type_read(order_hash: felt252) -> Option<OrderType> {
    let key = array![ORDER_DB_BASE_KEY, order_hash];

    let base = starknet::storage_base_address_from_felt252(
        poseidon::poseidon_hash_span(key.span())
    );

    // First offset is the status.
    let order_type: felt252 = starknet::storage_read_syscall(
        ADDRESS_DOMAIN, starknet::storage_address_from_base_and_offset(base, 1)
    ).unwrap_syscall();

    order_type.try_into()
}

/// Reads only the status of the given order.
///
/// # Arguments
///
/// * `order_hash` - Hash of the order used as key.
fn order_status_read(order_hash: felt252) -> Option<OrderStatus> {
    let key = array![ORDER_DB_BASE_KEY, order_hash];

    let base = starknet::storage_base_address_from_felt252(
        poseidon::poseidon_hash_span(key.span())
    );

    // First offset is the status.
    let status: felt252 = starknet::storage_read_syscall(
        ADDRESS_DOMAIN, starknet::storage_address_from_base_and_offset(base, 0)
    ).unwrap_syscall();

    status.try_into()
}

/// Writes only the status of the given order. Will fail
/// if the order is not already written with a valid status.
/// Status must NOT be NONE to be overwritten. As we consider
/// an order to be in the storage only if it's at least OPEN.
///
/// # Arguments
///
/// * `order_hash` - Hash of the order used as key.
fn order_status_write(order_hash: felt252, status: OrderStatus) -> bool {
    let db_status = order_status_read(order_hash);

    if db_status.is_none() {
        return false;
    }

    let key = array![ORDER_DB_BASE_KEY, order_hash];

    let base = starknet::storage_base_address_from_felt252(
        poseidon::poseidon_hash_span(key.span())
    );

    // At offset 0, we have the status.
    starknet::storage_write_syscall(
        ADDRESS_DOMAIN, starknet::storage_address_from_base_and_offset(base, 0), status.into()
    );

    true
}
