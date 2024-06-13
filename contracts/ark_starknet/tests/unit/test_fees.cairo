use snforge_std::{test_address};

use ark_starknet::executor::{executor};
use ark_starknet::interfaces::FeesRatio;

use starknet::{ContractAddress};

#[test]
fn test_add_broker() {
    let mut state = executor::contract_state_for_testing();

    let fees_ratio = FeesRatio { numerator: 10, denominator: 100, };

    let broker_address = test_address();

    // Call the add_broker method.
    executor::ExecutorImpl::set_broker_fees(ref state, broker_address, fees_ratio);

    let result = executor::ExecutorImpl::get_broker_fees(@state, broker_address);

    assert(result == fees_ratio, 'Fees are not equal');
}

#[test]
fn test_set_ark_fees() {
    let mut state = executor::contract_state_for_testing();

    let fees_ratio = FeesRatio { numerator: 5, denominator: 100, };

    executor::ExecutorImpl::set_ark_fees(ref state, fees_ratio);

    let result = executor::ExecutorImpl::get_ark_fees(@state);

    assert(result == fees_ratio, 'Fees are not equal');
}
