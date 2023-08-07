use log::error;
use starknet::{
    core::{
        types::{BlockId, BlockTag, FieldElement, FunctionCall},
        utils::parse_cairo_short_string,
    },
    macros::selector,
    providers::{jsonrpc::HttpTransport, JsonRpcClient, Provider},
};

pub struct CurrencyData {
    pub symbol: String,
    pub contract_address: String,
}

pub async fn fetch_currency_data(
    rpc_client: &JsonRpcClient<HttpTransport>,
    currency_contract: FieldElement,
) -> CurrencyData {
    let currency_contract_str = format!("{:#064x}", currency_contract);

    let call_result = rpc_client
        .call(
            FunctionCall {
                contract_address: currency_contract,
                entry_point_selector: selector!("symbol"),
                calldata: vec![],
            },
            BlockId::Tag(BlockTag::Latest),
        )
        .await;

    let currency_symbol_str = match call_result {
        Ok(items) => {
            let symbol_field = items[0];
            let result = parse_cairo_short_string(&symbol_field).unwrap_or("".to_string());
            result
        }

        Err(e) => {
            error!("Error fetch_currency_data: {:?}", e);
            "".to_string()
        }
    };

    CurrencyData {
        symbol: currency_symbol_str,
        contract_address: currency_contract_str,
    }
}
