use starknet::{
    accounts::{Account, ConnectedAccount, ExecutionEncoding, SingleOwnerAccount},
    core::types::{BlockId, BlockTag, FieldElement},
    providers::{jsonrpc::HttpTransport, AnyProvider, JsonRpcClient},
    signers::{LocalWallet, SigningKey},
};
use starknet_abigen_macros::abigen;
use starknet_abigen_parser::call::TransactionStatus;
use url::Url;

abigen!(OrderbookContract, "./artifacts/orderbook.json");

pub fn new_orderbook<A: ConnectedAccount + Send + Sync + 'static>(
    contract_address: FieldElement,
    account: A,
) -> OrderbookContract<A> {
    OrderbookContract::new(contract_address, account)
}
