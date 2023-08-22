use ark_db::collection::update::update_collection;
use ark_starknet::utils::get_contract_property_string;
use log::info;
use num_bigint::BigUint;
use reqwest::Client as ReqwestClient;
use starknet::{
    core::types::{BlockId, BlockTag, FieldElement, FunctionCall},
    macros::selector,
    providers::{jsonrpc::HttpTransport, JsonRpcClient, Provider},
};
use std::error::Error;

pub async fn get_collection_supply(
    rpc_client: &JsonRpcClient<HttpTransport>,
    contract_address: &str,
) -> String {
    let request = FunctionCall {
        contract_address: FieldElement::from_hex_be(contract_address).unwrap(),
        entry_point_selector: selector!("totalSupply"),
        calldata: vec![],
    };

    let call_result = rpc_client
        .call(request, BlockId::Tag(BlockTag::Latest))
        .await;

    match call_result {
        Ok(data) => {
            info!("Get supply data: {:?}", data);

            let supply_low = data[0].to_string().as_str().parse::<u128>().unwrap();
            let supply_high = data[1].to_string().as_str().parse::<u128>().unwrap();
            let low_bytes = supply_low.to_be_bytes();
            let high_bytes = supply_high.to_be_bytes();
            let mut bytes: Vec<u8> = Vec::new();
            bytes.extend(high_bytes);
            bytes.extend(low_bytes);
            let supply_big_uint = BigUint::from_bytes_be(&bytes[..]);
            let supply: String = supply_big_uint.to_str_radix(10);

            supply
        }
        Err(e) => {
            info!("Get supply error: {:?}", e);
            "".to_string()
        }
    }
}

pub async fn update_additional_collection_data(
    rpc_client: &JsonRpcClient<HttpTransport>,
    client: &ReqwestClient,
    dynamo_client: &aws_sdk_dynamodb::Client,
    contract_address: &str,
    block_number: u64,
) -> Result<(), Box<dyn Error>> {
    info!("update_additional_collection_data");

    let collection_symbol =
        get_contract_property_string(client, contract_address, "symbol", vec![], block_number)
            .await;

    info!("collection_symbol: {:?}", collection_symbol);

    let collection_name =
        get_contract_property_string(client, contract_address, "name", vec![], block_number).await;

    info!("collection_name: {:?}", collection_name);

    let collection_supply = get_collection_supply(rpc_client, contract_address).await;

    info!("collection_supply: {}", collection_supply);

    update_collection(
        dynamo_client,
        contract_address.to_string(),
        collection_name,
        collection_symbol,
        collection_supply,
    )
    .await?;

    Ok(())
}
