use snforge_std::{test_address};

use ark_starknet::executor::{
    executor
};
use starknet::{ContractAddress};

#[test]
fn test_add_broker() {

    let mut state = executor::contract_state_for_testing();

    let fee = 100;

    let broker_address = test_address();

    // Call the add_broker method.
    executor::ExecutorImpl::add_broker_fees(ref state, broker_address, fee);

    let result = executor::ExecutorImpl::get_broker_fees(ref state, broker_address);

    assert(result == fee, 'Fees are not equal');

}

