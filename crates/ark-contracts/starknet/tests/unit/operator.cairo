use ark_operator::operator::operator;

use snforge_std::{
    PrintTrait, start_warp, declare, ContractClassTrait, spy_events, EventSpy, EventFetcher,
    EventAssertions, Event, signature::{StarkCurveKeyPair, StarkCurveKeyPairTrait, Verifier}
};

#[test]
fn test_transfer_royalties() {
    let mut state = operator::contract_state_for_testing();

    let eth_contract_addr: starknet::ContractAddress = 0x0.into();
    let zero_addr: starknet::ContractAddress = 0x0.into();

    let eth_dispatcher = operator::IERCDispatcher { contract_address: eth_contract_addr };

    let mut state = operator::InternalFunctionsTrait::_transfer_royalties(
        ref state,
        operator::ExecutionInfo {
            route: operator::RouteType::Erc721ToErc20,
            order_hash: 0,
            token_id: 0,
            quantity: 1,
            token_address: zero_addr,
            offerer_address: zero_addr,
            fulfiller_address: zero_addr,
            price: 0,
            creator_address: zero_addr,
            creator_fee: 0,
            create_broker_address: zero_addr,
            create_broker_fee: 0,
            fulfill_broker_address: zero_addr,
            fulfill_broker_fee: 0
        },
        eth_contract_addr
    );
}
