use serde::Serde;

use starknet::{ContractAddress, contract_address_const};

use ark_common::protocol::order_v1::OrderV1;
use ark_common::protocol::order_types::RouteType;


use ark_starknet::interfaces::{
    IExecutorDispatcher, IExecutorDispatcherTrait,
};

use ark_tokens::erc20::IFreeMintDispatcher as Erc20Dispatcher;
use ark_tokens::erc20::IFreeMintDispatcherTrait as Erc20DispatcherTrait;
use ark_tokens::erc721::IFreeMintDispatcher as Erc721Dispatcher;
use ark_tokens::erc721::IFreeMintDispatcherTrait as Erc721DispatcherTrait;

use snforge_std as snf;
use snf::{ContractClass, ContractClassTrait, CheatTarget};

fn deploy_erc20() -> ContractAddress {
    let contract = snf::declare('FreeMintERC20');
    let initial_supply: u256 = 10_000_000_000_u256;
    let name: ByteArray = "DummyERC20";
    let symbol: ByteArray = "DUMMY";

    let mut calldata: Array<felt252> = array![];
    initial_supply.serialize(ref calldata);
    name.serialize(ref calldata);
    symbol.serialize(ref calldata);
    let erc20_address = contract.deploy(@calldata).unwrap();
    erc20_address
}

fn deploy_nft() -> ContractAddress {
    let contract = snf::declare('FreeMintNFT');
    let name: ByteArray = "DummyNFT";
    let symbol: ByteArray = "DUMNFT";
    let base_uri: ByteArray = "";

    let mut calldata: Array<felt252> = array![];
    name.serialize(ref calldata);
    symbol.serialize(ref calldata);
    base_uri.serialize(ref calldata);
    contract.deploy(@calldata).unwrap()
}

fn deploy_executor() -> ContractAddress {
    let messaging_contract = snf::declare('appchain_messaging');
    let messaging_owner = contract_address_const::<'messaging_owner'>();
    let appchain_account = contract_address_const::<'messaging_account'>();
    let mut messaging_calldata: Array<felt252> = array![];
    messaging_calldata.append(messaging_owner.into());
    messaging_calldata.append(appchain_account.into());
    let messaging_address = messaging_contract.deploy(@messaging_calldata).unwrap();


    let contract = snf::declare('executor');
    let admin_address = contract_address_const::<'admin'>();
    let eth_address = contract_address_const::<'eth'>();

    let mut calldata: Array<felt252> = array![];
    calldata.append(admin_address.into());
    calldata.append(eth_address.into());
    calldata.append(messaging_address.into());
    calldata.append('SN_MAIN');
    contract.deploy(@calldata).unwrap()
}

fn setup() -> (ContractAddress, ContractAddress, ContractAddress) {
    let erc20_address = deploy_erc20();
    let nft_address = deploy_nft();
    let executor_address = deploy_executor();
    (executor_address, erc20_address, nft_address)
}

fn setup_order(erc20_address: ContractAddress, nft_address: ContractAddress) -> OrderV1 {
    let chain_id = 'SN_MAIN';
    let block_timestamp = starknet::get_block_timestamp();
    let end_date = block_timestamp + (30 * 24 * 60 * 60);
    let data = array![];

    OrderV1 {
        route: RouteType::Erc20ToErc721.into(),
        currency_address: erc20_address,
        currency_chain_id: chain_id,
        salt: 1,
        offerer: contract_address_const::<'dummy'>(),
        token_chain_id: chain_id,
        token_address: nft_address,
        token_id: Option::Some(10),
        quantity: 1,
        start_amount: 100_000_u256,
        end_amount: 0,
        start_date: block_timestamp,
        end_date: end_date,
        broker_id: contract_address_const::<'broker_id'>(),
        additional_data: data.span()
    }
}

#[test]
#[should_panic(expected: ("Caller is not the offerer", ))]
fn test_create_order_offerer_shall_be_caller() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let caller = contract_address_const::<'caller'>();

    let mut order = setup_order(erc20_address, nft_address);
    order.offerer = offerer;

    snf::start_prank(CheatTarget::One(executor_address), caller);
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    snf::stop_prank(CheatTarget::One(executor_address));
}

#[test]
#[should_panic(expected: ("Offerer does not own enough ERC20 tokens", ))]
fn test_create_order_offerer_not_enough_erc20_tokens() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;
    let minted = 10_000;

    Erc20Dispatcher { contract_address: erc20_address}.mint(offerer, minted);

    let mut order = setup_order(erc20_address, nft_address);
    order.offerer = offerer;
    order.start_amount = start_amount; 

    snf::start_prank(CheatTarget::One(executor_address), offerer);
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    snf::stop_prank(CheatTarget::One(executor_address));
}

#[test]
#[should_panic(expected: ("Offerer does not own the specified ERC721 token", ))]
fn test_create_order_offerer_not_own_ec721_token() {
    let (executor_address, erc20_address, nft_address) = setup();
    let offerer = contract_address_const::<'offerer'>();
    let other = contract_address_const::<'other'>();
    
    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address}.get_current_token_id().into();
    Erc721Dispatcher { contract_address: nft_address}.mint(other, 'base_uri');
    
    let mut order = setup_order(erc20_address, nft_address);
    order.route = RouteType::Erc721ToErc20.into();
    order.offerer = offerer;
    order.token_id = Option::Some(token_id);

    snf::start_prank(CheatTarget::One(executor_address), offerer);
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);
    snf::stop_prank(CheatTarget::One(executor_address));

}