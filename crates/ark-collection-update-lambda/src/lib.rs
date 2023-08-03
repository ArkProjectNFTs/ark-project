use ark_db::collection::update::update_collection;
use ark_starknet::utils::get_contract_property_string;
use log::info;
use reqwest::Client as ReqwestClient;
use std::error::Error;

pub async fn update_additional_collection_data(
    client: &ReqwestClient,
    dynamo_client: &aws_sdk_dynamodb::Client,
    contract_address: &str,
    block_number: u64,
) -> Result<(), Box<dyn Error>> {
    info!("update_additional_collection_data");

    let collection_symbol =
        get_contract_property_string(client, contract_address, "symbol", vec![], block_number)
            .await;

    let collection_name =
        get_contract_property_string(client, contract_address, "name", vec![], block_number).await;

    info!("collection_name: {:?}", collection_name);

    update_collection(
        dynamo_client,
        contract_address.to_string(),
        collection_name,
        collection_symbol,
    )
    .await?;

    Ok(())
}
