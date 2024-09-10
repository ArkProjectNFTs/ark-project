// Test for Component ERC2981
use starknet::{ContractAddress, contract_address_const};

use openzeppelin::introspection::interface::{ISRC5Dispatcher, ISRC5DispatcherTrait};

use ark_oz::erc2981::interface::IERC2981_ID;
use ark_oz::erc2981::{IERC2981Dispatcher, IERC2981DispatcherTrait};
use ark_oz::erc2981::{IERC2981SetupDispatcher, IERC2981SetupDispatcherTrait};

use ark_oz::erc2981::{FeesRatio, FeesImpl, FeesRatioDefault};

use snforge_std::{ContractClass, ContractClassTrait, declare, DeclareResultTrait, cheat_caller_address, CheatSpan};

fn setup_contract() -> (ContractAddress, ContractAddress, ContractAddress, FeesRatio) {
    let owner = contract_address_const::<'owner'>();
    let receiver = contract_address_const::<'receiver'>();
    let default_fees: FeesRatio = Default::default();

    let contract = declare("MockERC2981").unwrap().contract_class();
    let mut calldata: Array<felt252> = array![];
    calldata.append(owner.into());
    calldata.append(receiver.into());
    default_fees.serialize(ref calldata);
    let (mock_erc2981_address, _) = contract.deploy(@calldata).unwrap();
    (mock_erc2981_address, owner, receiver, default_fees)
}

#[test]
fn test_fees_ratio_invalid() {
    assert!(!FeesRatio { numerator: 0, denominator: 0, }.is_valid(), "(0,0) Shall be invalid");
    assert!(!FeesRatio { numerator: 30, denominator: 30, }.is_valid(), "(30,30) Shall be invalid");
    assert!(!FeesRatio { numerator: 40, denominator: 30, }.is_valid(), "(40,30) Shall be invalid");
    assert!(FeesRatio { numerator: 5, denominator: 10000, }.is_valid(), "(5,10000) Shall be valid");
    assert!(!FeesRatio { numerator: 5, denominator: 10001, }.is_valid(), "(5,10001) Shall be invalid");
    assert!(!FeesRatio { numerator: 0, denominator: 0 }.is_valid(), "(0,0) Shall be invalid");
    assert!(FeesRatio { numerator: 0, denominator: 1, }.is_valid(), "(0,1) Shall be valid");
}

#[test]
fn test_default_royalty() {
    let (contract_address, _, default_receiver, default_fees) = setup_contract();
    let token = IERC2981SetupDispatcher { contract_address: contract_address };
    let (receiver, fees_ratio) = token.default_royalty();
    assert_eq!(receiver, default_receiver, "Default receiver incorrect");
    assert_eq!(fees_ratio, default_fees, "Default fees incorrect");
}

#[test]
fn test_erc2981_interface_is_supported() {
    let (contract_address, _, _, _) = setup_contract();
    let is_supported = ISRC5Dispatcher { contract_address: contract_address }
        .supports_interface(IERC2981_ID);
    assert!(is_supported, "ERC2981 interface shall be supported");
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_only_owner_can_set_default_royalty() {
    let (contract_address, _, _, _) = setup_contract();
    let alice = contract_address_const::<'alice'>();
    let other_receiver = contract_address_const::<'other_receiver'>();
    let token = IERC2981SetupDispatcher { contract_address: contract_address };
    cheat_caller_address(contract_address, alice, CheatSpan::TargetCalls(1));
    token.set_default_royalty(other_receiver, Default::default());
}

// TODO: add event check
#[test]
fn test_owner_set_default_royalty() {
    let (contract_address, owner, _, _) = setup_contract();
    let other_receiver = contract_address_const::<'other_receiver'>();
    let other_fees = FeesRatio { numerator: 5, denominator: 100, };
    let token = IERC2981SetupDispatcher { contract_address: contract_address };

    cheat_caller_address(contract_address, owner, CheatSpan::TargetCalls(1));
    token.set_default_royalty(other_receiver, other_fees);

    let (receiver, fees_ratio) = token.default_royalty();
    assert_eq!(receiver, other_receiver, "Default receiver not updated");
    assert_eq!(fees_ratio, other_fees, "Default fees not updated");
}

// TODO: add event check
#[test]
fn test_owner_set_token_royalty() {
    let token_id = 256;
    let (contract_address, owner, _, _) = setup_contract();
    let other_receiver = contract_address_const::<'other_receiver'>();
    let other_fees = FeesRatio { numerator: 5, denominator: 100, };
    let token = IERC2981SetupDispatcher { contract_address: contract_address };

    cheat_caller_address(contract_address, owner, CheatSpan::TargetCalls(1));
    token.set_token_royalty(token_id, other_receiver, other_fees);

    let (receiver, fees_ratio) = token.token_royalty(token_id);
    assert_eq!(receiver, other_receiver, "Token receiver not updated");
    assert_eq!(fees_ratio, other_fees, "Token fees not updated");
    let (receiver, fees_ratio) = token.default_royalty();
    assert!(receiver != other_receiver, "Default receiver shall not be updated");
    assert!(fees_ratio != other_fees, "Default fees shall not be updated");
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_only_owner_can_set_token_royalty() {
    let token_id = 256;
    let alice = contract_address_const::<'alice'>();
    let (contract_address, _, _, _) = setup_contract();
    let other_receiver = contract_address_const::<'other_receiver'>();
    let other_fees = FeesRatio { numerator: 5, denominator: 100, };
    let token = IERC2981SetupDispatcher { contract_address: contract_address };

    cheat_caller_address(contract_address, alice, CheatSpan::TargetCalls(1));
    token.set_token_royalty(token_id, other_receiver, other_fees);
}

#[test]
fn test_royalty_compute() {
    let (contract_address, owner, _, _) = setup_contract();
    let token = IERC2981SetupDispatcher { contract_address: contract_address };
    let token_receiver = contract_address_const::<'token_receiver'>();
    let token_id = 255;
    let token_fees = FeesRatio { numerator: 10, denominator: 100, };

    let other_receiver = contract_address_const::<'other_receiver'>();
    let other_fees = FeesRatio { numerator: 5, denominator: 100 };

    cheat_caller_address(contract_address, owner, CheatSpan::TargetCalls(2));
    token.set_token_royalty(token_id, token_receiver, token_fees);
    token.set_default_royalty(other_receiver, other_fees);

    let sale_price = 100_000_000;
    let token = IERC2981Dispatcher { contract_address: contract_address };

    let (receiver, fees_amount) = token.royalty_info(token_id, sale_price);
    assert_eq!(receiver, token_receiver, "Wrong token receiver");
    assert_eq!(fees_amount, 10_000_000, "Wrong amount for token fees");

    let (receiver, fees_amount) = token.royalty_info(2, sale_price);
    assert_eq!(receiver, other_receiver, "Wrong default receiver");
    assert_eq!(fees_amount, 5_000_000, "Wrong amount for default fees");
}
