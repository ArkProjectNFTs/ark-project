use ark_common::protocol::order_types::{OrderTrait, RouteType};
use ark_common::protocol::order_v1::OrderV1;

use ark_starknet::interfaces::{IExecutorDispatcher, IExecutorDispatcherTrait,};

use ark_tokens::erc20::{IFreeMintDispatcher, IFreeMintDispatcherTrait};
use ark_tokens::erc721::IFreeMintDispatcher as Erc721Dispatcher;
use ark_tokens::erc721::IFreeMintDispatcherTrait as Erc721DispatcherTrait;

use serde::Serde;
use snforge_std::{
    cheat_caller_address, CheatSpan, ContractClass, ContractClassTrait, declare, DeclareResultTrait
};

use starknet::{ContractAddress, contract_address_const};

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
    let contract = declare("executor").unwrap().contract_class();
    let admin_address = contract_address_const::<'admin'>();
    let eth_address = contract_address_const::<'eth'>();

    let mut calldata: Array<felt252> = array![];
    calldata.append(admin_address.into());
    calldata.append(eth_address.into());
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

fn setup_erc20_order() -> (ContractAddress, ContractAddress, ContractAddress) {
    let erc20_address = deploy_erc20();
    let token_address = deploy_erc20();
    let executor_address = deploy_executor();
    (executor_address, erc20_address, token_address)
}

fn setup_royalty() -> (ContractAddress, ContractAddress, ContractAddress) {
    let erc20_address = deploy_erc20();
    let nft_address = deploy_nft(true);
    let executor_address = deploy_executor();
    (executor_address, erc20_address, nft_address)
}

fn setup_order(
    currency_address: ContractAddress,
    nft_address: ContractAddress,
    route: RouteType,
    offerer: ContractAddress,
    token_id: Option<u256>,
    start_amount: u256,
    end_amount: u256,
    quantity: u256,
) -> OrderV1 {
    let chain_id = 'SN_MAIN';
    let block_timestamp = starknet::get_block_timestamp();
    let end_date = block_timestamp + (30 * 24 * 60 * 60);
    let data = array![];

    OrderV1 {
        route,
        currency_address,
        currency_chain_id: chain_id,
        salt: 1,
        offerer,
        token_chain_id: chain_id,
        token_address: nft_address,
        token_id,
        quantity: quantity,
        start_amount,
        end_amount,
        start_date: block_timestamp,
        end_date: end_date,
        broker_id: contract_address_const::<'broker_id'>(),
        additional_data: data.span()
    }
}

fn setup_offer_order(
    currency_address: ContractAddress,
    nft_address: ContractAddress,
    offerer: ContractAddress,
    token_id: u256,
    start_amount: u256,
) -> OrderV1 {
    setup_order(
        currency_address,
        nft_address,
        RouteType::Erc20ToErc721,
        offerer,
        Option::Some(token_id),
        start_amount,
        0,
        1
    )
}

fn setup_listing_order(
    currency_address: ContractAddress,
    nft_address: ContractAddress,
    offerer: ContractAddress,
    token_id: u256,
    start_amount: u256,
) -> OrderV1 {
    setup_order(
        currency_address,
        nft_address,
        RouteType::Erc721ToErc20,
        offerer,
        Option::Some(token_id),
        start_amount,
        0,
        1
    )
}

fn setup_auction_order(
    currency_address: ContractAddress,
    nft_address: ContractAddress,
    offerer: ContractAddress,
    token_id: u256,
    start_amount: u256,
    end_amount: u256,
) -> OrderV1 {
    setup_order(
        currency_address,
        nft_address,
        RouteType::Erc721ToErc20,
        offerer,
        Option::Some(token_id),
        start_amount,
        end_amount,
        1
    )
}

fn setup_collection_offer_order(
    currency_address: ContractAddress,
    nft_address: ContractAddress,
    offerer: ContractAddress,
    start_amount: u256,
) -> OrderV1 {
    setup_order(
        currency_address,
        nft_address,
        RouteType::Erc20ToErc721,
        offerer,
        Option::None,
        start_amount,
        0,
        1
    )
}

fn setup_buy_limit_order(
    currency_address: ContractAddress,
    token_address: ContractAddress,
    offerer: ContractAddress,
    start_amount: u256,
    quantity: u256
) -> OrderV1 {
    setup_order(
        currency_address,
        token_address,
        RouteType::Erc20ToErc20Buy,
        offerer,
        Option::None,
        start_amount,
        0,
        quantity
    )
}

fn setup_sell_limit_order(
    currency_address: ContractAddress,
    token_address: ContractAddress,
    offerer: ContractAddress,
    start_amount: u256,
    quantity: u256
) -> OrderV1 {
    setup_order(
        currency_address,
        nft_address,
        RouteType::Erc20ToErc20Sell,
        offerer,
        Option::None,
        start_amount,
        0,
        quantity
    )
}

fn setup_default_order(erc20_address: ContractAddress, nft_address: ContractAddress) -> OrderV1 {
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

fn create_offer_order(
    executor_address: ContractAddress,
    erc20_address: ContractAddress,
    nft_address: ContractAddress,
    token_id: u256
) -> (felt252, ContractAddress, u256) {
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;

    IFreeMintDispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let order = setup_offer_order(erc20_address, nft_address, offerer, token_id, start_amount);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    (order.compute_order_hash(), offerer, start_amount)
}

fn create_listing_order(
    executor_address: ContractAddress,
    erc20_address: ContractAddress,
    nft_address: ContractAddress,
    start_amount: u256
) -> (felt252, ContractAddress, u256) {
    let offerer = contract_address_const::<'offerer'>();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let order = setup_listing_order(erc20_address, nft_address, offerer, token_id, start_amount);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    (order.compute_order_hash(), offerer, token_id)
}

fn create_auction_order(
    executor_address: ContractAddress,
    erc20_address: ContractAddress,
    nft_address: ContractAddress,
    start_amount: u256,
    end_amount: u256
) -> (felt252, ContractAddress, u256) {
    let offerer = contract_address_const::<'offerer'>();

    let token_id: u256 = Erc721Dispatcher { contract_address: nft_address }
        .get_current_token_id()
        .into();
    Erc721Dispatcher { contract_address: nft_address }.mint(offerer, 'base_uri');

    let order = setup_auction_order(
        erc20_address, nft_address, offerer, token_id, start_amount, end_amount
    );

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    (order.compute_order_hash(), offerer, token_id)
}

fn create_collection_offer_order(
    executor_address: ContractAddress, erc20_address: ContractAddress, nft_address: ContractAddress,
) -> (felt252, ContractAddress, u256) {
    let offerer = contract_address_const::<'offerer'>();
    let start_amount = 10_000_000;

    IFreeMintDispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let order = setup_collection_offer_order(erc20_address, nft_address, offerer, start_amount);

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    (order.compute_order_hash(), offerer, start_amount)
}


fn create_buy_limit_order(
    executor_address: ContractAddress,
    erc20_address: ContractAddress,
    token_address: ContractAddress,
    start_amount: u256,
    quantity: u256
) -> (felt252, ContractAddress, u256) {
    let offerer = contract_address_const::<'offerer'>();

    IFreeMintDispatcher { contract_address: erc20_address }.mint(offerer, start_amount);

    let order = setup_buy_limit_order(
        erc20_address, token_address, offerer, start_amount, quantity
    );

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    (order.compute_order_hash(), offerer, start_amount)
}

fn create_sell_limit_order(
    executor_address: ContractAddress,
    erc20_address: ContractAddress,
    token_address: ContractAddress,
    start_amount: u256,
    quantity: u256
) -> (felt252, ContractAddress, u256) {
    let offerer = contract_address_const::<'offerer'>();

    IFreeMintDispatcher { contract_address: token_address }.mint(offerer, quantity);

    let order = setup_sell_limit_order(
        erc20_address, token_address, offerer, start_amount, quantity
    );

    cheat_caller_address(executor_address, offerer, CheatSpan::TargetCalls(1));
    IExecutorDispatcher { contract_address: executor_address }.create_order(order);

    (order.compute_order_hash(), offerer, quantity)
}