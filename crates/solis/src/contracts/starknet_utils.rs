use starknet::{
    core::types::FieldElement,
    providers::{jsonrpc::HttpTransport, AnyProvider, JsonRpcClient},
};
use starknet_abigen_macros::abigen;

use url::Url;

abigen!(StarknetUtils, "./artifacts/starknet_utils.json");

pub fn new_starknet_utils_reader(
    contract_address: FieldElement,
    provider_url: &str,
) -> StarknetUtilsReader<AnyProvider> {
    let rpc_url = Url::parse(provider_url).expect("Expecting valid Starknet RPC URL");
    let provider =
        AnyProvider::JsonRpcHttp(JsonRpcClient::new(HttpTransport::new(rpc_url.clone())));

    StarknetUtilsReader::new(contract_address, provider)
}
