use ark_common::protocol::order_types::{
    RouteType, PriceLevel, PriceLevelTraitV1
};
use starknet::storage_access::{
    StoreFelt252, StorageBaseAddress, storage_base_address_from_felt252, storage_base_address_const
};
use starknet::contract_address_to_felt252;

use super::super::interface::{orderbook_errors};

mod Consts {
    const EMPTY: felt252 = 0;
    const DELETED: felt252 =
        0x800000000000011000000000000000000000000000000000000000000000000; // -1
}

// adds a buy or sell price level market for token address
fn add_new_token_market(token_address: ContractAddress, price_level_hash: felt252) {
    let address = contract_address_to_felt252(token_address);
    add_to_storage(address, price_level_hash);
}

// removes a buy or sell market for token adddress
fn remove_token_market(token_address: ContractAddress, price_level_hash: felt252) {
    let address = contract_address_to_felt252(token_address);
    remove_value_from_storage(address, price_level_hash);
}

/// Removes all price levels from a token market. If none exist then nothing changes.
fn remove_all_price_levels(token_address: ContractAddress) -> Array<felt252> {
    let address = contract_address_to_felt252(token_address);
    remove_all_values_from_storage(address)
}

/// Get all price levels of a given token address. Empty array is returned if none exist.
fn get_all_price_levels(token_address: ContractAddress) -> Array<felt252> {
    let address = contract_address_to_felt252(token_address);
    get_all_values_from_storage(address)
}

/// Add new order hash to price level 
fn add_order_to_price_level(price_level_hash: felt252, order_hash: felt252) {
    add_to_storage(price_level_hash, order_hash);
}

/// Removes order from a price level
fn remove_order_from_price_level(price_level_hash: felt252, order_hash: felt252) {
    remove_value_from_storage(price_level_hash, order_hash);
}

//  Removes all orders from a price level. If none exist then nothing changes. 
fn remove_all_orders_from_price_level(price_level_hash: felt252) -> Array<felt252>  {
    remove_all_values_from_storage(price_level_hash)
}

/// Get all orders from a  price levels. Empty array is returned if none exist.
fn get_all_orders_from_price_level(price_level_hash: felt252) -> Array<felt252>  {
    get_all_values_from_storage(price_level_hash)
}


fn add_to_storage(k: felt252, v: felt252){
    if v == Consts::EMPTY|| v == Consts::DELETED {
        panic_with_felt252('CANT USE PRESET VALUE')
    }

    let mut offset = 0;
    loop {
        let thash = StoreFelt252::read_at_offset(0, k, offset).unwrap();
        if thash == Consts::EMPTY {
            StoreFelt252::write_at_offset(0, k, offset, v).is_ok();
            break;
        }
        if (thash == v) {
            panic_with_felt252('VALUE EXISTS');
        }
        offset = offset + 1;
    }
}

fn remove_value_from_storage(k: felt252, v: felt252) {
    if v == Consts::EMPTY|| v == Consts::DELETED {
        panic_with_felt252('CANT USE PRESET VALUE')
    }

    let mut offset = 0;
    loop {
        let thash = StoreFelt252::read_at_offset(0, k, offset).unwrap();
        if thash == Consts::EMPTY {
            break;
        }
        if (thash == v) {
            StoreFelt252::write_at_offset(0, k, offset, Consts::DELETED).is_ok();
            break;
        }
        offset = offset + 1;
    }
}

fn remove_all_values_from_storage(k: felt252) -> Array<felt252> {
    let mut result = array![];
    let mut offset = 0;
    loop {
        let thash = StoreFelt252::read_at_offset(0, k, offset).unwrap();
        if thash == Consts::EMPTY {
            break;
        }
        if (thash != Consts::DELETED) {
            result.append(thash);
            StoreFelt252::write_at_offset(0, k, offset, Consts::DELETED).is_ok();
        }
        offset = offset + 1;
    };
    return result;
}

fn get_all_values_from_storage(k: felt252) -> Array<felt252>{
    let mut result = array![];
    let mut offset = 0;
    loop {
        let thash = StoreFelt252::read_at_offset(0, k, offset).unwrap();
        if thash == Consts::EMPTY {
            break;
        }
        if (thash != Consts::DELETED) {
            result.append(thash);
        }
        offset = offset + 1;
    };
    return result;
}

/// Returns true if given value exists in key
fn check_if_exists(k: felt252, v: felt252) -> bool {
    if v == Consts::EMPTY || v == Consts::DELETED {
        panic_with_felt252('CANT USE PRESET VALUE')
    }

    let mut offset = 0;
    let mut found: bool = false;
    loop {
        let thash = StoreFelt252::read_at_offset(0, k, offset).unwrap();
        if thash == Consts::EMPTY {
            break;
        }
        if thash == v {
            found = true;
            break;
        }
        offset = offset + 1;
    };
    return found;
}

/// Returns true if key has any value
fn any(k: felt252) -> bool {
    let mut offset = 0;
    let mut found: bool = false;
    loop {
        let thash = StoreFelt252::read_at_offset(0, address, offset).unwrap();
        if thash == Consts::EMPTY {
            break;
        }
        if thash != Consts::DELETED {
            found = true;
            break;
        }
        offset = offset + 1;
    };
    return found;
}