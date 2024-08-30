use serde::Serde;

use starknet::{ContractAddress, contract_address_const};
use snforge_std::{ContractClass, ContractClassTrait, declare, DeclareResultTrait};

use ark_common::protocol::order_v1::OrderV1;
use ark_common::protocol::order_types::RouteType;

fn deploy_erc20() -> ContractAddress {
    let contract = declare("FreeMintERC20").unwrap().contract_class();
    let initial_supply: u256 = 10_000_000_000_u256;
    let name: ByteArray = "DummyERC20";
    let symbol: ByteArray = "DUMMY";

    let mut calldata: Array<felt252> = array![];
    initial_supply.serialize(ref calldata);
    name.serialize(ref calldata);
    symbol.serialize(ref calldata);
    let (erc20_address, _) = contract.deploy(@calldata).unwrap();
    erc20_address
}

fn deploy_nft(royalty: bool) -> ContractAddress {
    let name: ByteArray = "DummyNFT";
    let symbol: ByteArray = "DUMNFT";
    let base_uri: ByteArray = "";

    let mut calldata: Array<felt252> = array![];
    name.serialize(ref calldata);
    symbol.serialize(ref calldata);
    base_uri.serialize(ref calldata);
    let (nft_address, _) = if royalty {
        let owner = contract_address_const::<'nft_owner'>();
        calldata.append(owner.into());
        let contract = declare("FreeMintNFTRoyalty").unwrap().contract_class();
        contract.deploy(@calldata).unwrap()
    } else {
        let contract = declare("FreeMintNFT").unwrap().contract_class();
        contract.deploy(@calldata).unwrap()
    };
    nft_address
}

fn deploy_executor() -> ContractAddress {
    let messaging_contract = declare("appchain_messaging").unwrap().contract_class();
    let messaging_owner = contract_address_const::<'messaging_owner'>();
    let appchain_account = contract_address_const::<'messaging_account'>();
    let mut messaging_calldata: Array<felt252> = array![];
    messaging_calldata.append(messaging_owner.into());
    messaging_calldata.append(appchain_account.into());
    let (messaging_address, _) = messaging_contract.deploy(@messaging_calldata).unwrap();

    let contract = declare("executor").unwrap().contract_class();
    let admin_address = contract_address_const::<'admin'>();
    let eth_address = contract_address_const::<'eth'>();

    let mut calldata: Array<felt252> = array![];
    calldata.append(admin_address.into());
    calldata.append(eth_address.into());
    calldata.append(messaging_address.into());
    calldata.append('SN_MAIN');
    let (executor_address, _) = contract.deploy(@calldata).unwrap();
    executor_address
}

fn setup() -> (ContractAddress, ContractAddress, ContractAddress) {
    let erc20_address = deploy_erc20();
    let nft_address = deploy_nft(false);
    let executor_address = deploy_executor();
    (executor_address, erc20_address, nft_address)
}

fn setup_royalty() -> (ContractAddress, ContractAddress, ContractAddress) {
    let erc20_address = deploy_erc20();
    let nft_address = deploy_nft(true);
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
