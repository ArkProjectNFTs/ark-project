use snforge_std::{
    PrintTrait, start_warp, declare, ContractClassTrait, spy_events, EventSpy, EventFetcher,
    EventAssertions, Event, signature::{StarkCurveKeyPair, StarkCurveKeyPairTrait, Verifier}
};

#[test]
fn test_execute_buy_order() {
    let contract = declare('operator');

    let admin_address: felt252 = 0x0.into();
    let arkchain_sequencer_address: felt252 = 0x0.into();
    let arkchain_orderbook_address: felt252 = 0x0.into();
    let eth_contract_address: felt252 = 0x0.into();
    let messaging_address: felt252 = 0x0.into();

    let contract_data = array![
        admin_address,
        arkchain_sequencer_address,
        arkchain_orderbook_address,
        eth_contract_address,
        messaging_address
    ];
    let contract_address = contract.deploy(@contract_data).unwrap();
}
