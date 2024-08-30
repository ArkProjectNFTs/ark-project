use ark_starknet::executor::{executor};
use ark_starknet::interfaces::FeesRatio;

use starknet::{ContractAddress};
use starknet::testing;

use snforge_std::{start_cheat_caller_address_global, stop_cheat_caller_address_global, test_address};

#[test]
fn test_add_broker() {
    let mut state = executor::contract_state_for_testing();

    let fees_ratio = FeesRatio { numerator: 10, denominator: 100, };

    let broker_address = test_address();

    // Call the add_broker method.
    start_cheat_caller_address_global(broker_address);
    executor::ExecutorImpl::set_broker_fees(ref state, fees_ratio);

    let result = executor::ExecutorImpl::get_broker_fees(@state, broker_address);

    assert(result == fees_ratio, 'Fees are not equal');
    stop_cheat_caller_address_global();
}

#[test]
fn test_set_ark_fees() {
    let mut state = executor::contract_state_for_testing();

    let fees_ratio = FeesRatio { numerator: 5, denominator: 100, };

    executor::ExecutorImpl::set_ark_fees(ref state, fees_ratio);

    let result = executor::ExecutorImpl::get_ark_fees(@state);

    assert(result == fees_ratio, 'Fees are not equal');
}

#[test]
#[should_panic(expected: ('Fees ratio is invalid',))]
fn test_fees_ratio_bigger_than_1_broker_fees() {
    let mut state = executor::contract_state_for_testing();

    let fees_ratio = FeesRatio { numerator: 500, denominator: 100, };

    let broker_address = test_address();
    start_cheat_caller_address_global(broker_address);
    executor::ExecutorImpl::set_broker_fees(ref state, fees_ratio);
    stop_cheat_caller_address_global();
}

#[test]
#[should_panic(expected: ('Fees ratio is invalid',))]
fn test_fees_ratio_bigger_than_1_ark_fees() {
    let mut state = executor::contract_state_for_testing();

    let fees_ratio = FeesRatio { numerator: 500, denominator: 100, };

    executor::ExecutorImpl::set_ark_fees(ref state, fees_ratio);
}

#[test]
#[should_panic(expected: ('Fees ratio is invalid',))]
fn test_fees_denominator_0_broker_fees() {
    let mut state = executor::contract_state_for_testing();

    let fees_ratio = FeesRatio { numerator: 10, denominator: 0, };

    let broker_address = test_address();
    start_cheat_caller_address_global(broker_address);
    executor::ExecutorImpl::set_broker_fees(ref state, fees_ratio);
    stop_cheat_caller_address_global();
}

#[test]
#[should_panic(expected: ('Fees ratio is invalid',))]
fn test_fees_denominator_0_ark_fees() {
    let mut state = executor::contract_state_for_testing();

    let fees_ratio = FeesRatio { numerator: 10, denominator: 0, };

    executor::ExecutorImpl::set_ark_fees(ref state, fees_ratio);
}
