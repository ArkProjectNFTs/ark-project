//! Orders database.
//!
//! The order database uses the `storage_read` and `storage_write`
//! syscalls directly to optimize how data are stored.
//!
//! The status is always stored independently of the seriliazed
//! broker. This allows a quick and cheap storage/retrieval of the status
//! without having to write/read the whole order.
//!
//! The only assumption for now is that,
//! a single order serialized buffer must not exceed
//! 256 felts.
//!
//! The storage layout is the following:
//!
//! 1. Compute the storage base address with [BROKER_DB_BASE_KEY, broker_id]
//! 2. At base address => The broker whitelisting status.
use starknet::SyscallResultTrait;
use starknet::ContractAddress;
use starknet::contract_address_to_felt252;


/// Must remain equal to 0 for now.
const ADDRESS_DOMAIN: u32 = 0;
/// A constant value used in the base key hash.
const BROKER_DB_BASE_KEY: felt252 = 'broker whitelist';


/// Reads whitelist status of broker.
///
/// # Arguments
///
/// * `broker_id` - ID of the broker.
fn broker_whitelist_read(broker_id: ContractAddress) -> bool {
    let key = array![BROKER_DB_BASE_KEY, contract_address_to_felt252(broker_id)];

    let base = starknet::storage_base_address_from_felt252(
        poseidon::poseidon_hash_span(key.span())
    );

    // First offset is the status.
    let whitelisted: felt252 = starknet::storage_read_syscall(
        ADDRESS_DOMAIN, starknet::storage_address_from_base(base)
    ).unwrap_syscall();

    whitelisted == 1
}

/// Writes only the whitelisted brokers.
/// It can be whitelisted or blacklisted.
///
/// # Arguments
///
/// * `broker_id` - ID of the broker.
/// * `status` - 1 if whitelisted, 0 if not.
fn broker_whitelist_write(broker_id: ContractAddress, status: felt252) -> bool {
    let key = array![BROKER_DB_BASE_KEY, contract_address_to_felt252(broker_id)];

    let base = starknet::storage_base_address_from_felt252(
        poseidon::poseidon_hash_span(key.span())
    );

    starknet::storage_write_syscall(
        ADDRESS_DOMAIN, starknet::storage_address_from_base(base), status
    );

    true
}
