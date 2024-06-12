use snforge_std::{test_address};

use ark_starknet::executor::{executor};
use starknet::{ContractAddress};

#[test]
fn test_add_broker() {
    let mut state = executor::contract_state_for_testing();

    let fee = (10_u256, 100_u256);

    let broker_address = test_address();

    // Call the add_broker method.
    executor::ExecutorImpl::set_broker_fees(ref state, broker_address, 10_u256, 100_u256);

    let result = executor::ExecutorImpl::get_broker_fees(ref state, broker_address);

    assert(result == fee, 'Fees are not equal');
}

#[test]
fn test_set_ark_fees() {
    let mut state = executor::contract_state_for_testing();

    let fee = (10_u256, 100_u256);

    executor::ExecutorImpl::set_ark_fees(ref state, 10_u256, 100_u256);

    let result = executor::ExecutorImpl::get_ark_fees(ref state);

    assert(result == fee, 'Fees are not equal');
}
