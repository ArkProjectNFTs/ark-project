use starknet::{accounts::ConnectedAccount, core::types::FieldElement};
use starknet_abigen_macros::abigen;

abigen!(OrderbookContract, "./artifacts/orderbook.json");

pub fn new_orderbook<A: ConnectedAccount + Send + Sync + 'static>(
    contract_address: FieldElement,
    account: A,
) -> OrderbookContract<A> {
    OrderbookContract::new(contract_address, account)
}
