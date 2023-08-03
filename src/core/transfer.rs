use crate::core::mint::{process_mint_event, TokenData, TransactionData};
use ark_db::token::update::update_token;
use ark_starknet::utils::TokenId;
use ark_starknet::{
    client::get_block_with_txs, client::get_token_owner, utils::get_contract_property_string,
};
use log::info;
use reqwest::Client as ReqwestClient;
use starknet::core::types::{EmittedEvent, FieldElement};
use std::error::Error;

async fn get_token_uri(
    client: &ReqwestClient,
    token_id_low: u128,
    token_id_high: u128,
    contract_address: &str,
    block_number: u64,
) -> String {
    info!("get_token_id: [{:?}, {:?}]", token_id_low, token_id_high);

    let token_id_low_hex = format!("{:x}", token_id_low);
    let token_id_high_hex = format!("{:x}", token_id_high);

    let token_uri_cairo0 = get_contract_property_string(
        client,
        contract_address,
        "tokenURI",
        vec![&token_id_low_hex, &token_id_high_hex],
        block_number,
    )
    .await;

    if token_uri_cairo0 != "undefined" && !token_uri_cairo0.is_empty() {
        return token_uri_cairo0;
    }

    let token_uri = get_contract_property_string(
        client,
        contract_address,
        "token_uri",
        vec![&token_id_low_hex, &token_id_high_hex],
        block_number,
    )
    .await;

    info!("token_uri: {:?}", token_uri);

    if token_uri != "undefined" && !token_uri.is_empty() {
        return token_uri;
    }

    "undefined".to_string()
}

pub async fn process_transfers(
    client: &ReqwestClient,
    dynamo_db_client: &aws_sdk_dynamodb::Client,
    value: &str,
    contract_type: &str,
) -> Result<(), Box<dyn Error>> {
    info!("Processing transfers: {:?}", value);

    //let data = str::from_utf8(&value.as_bytes())?;
    let event: EmittedEvent = serde_json::from_str(value)?;

    // Get block info
    let block = get_block_with_txs(client, event.block_number)
        .await
        .unwrap();
    let timestamp = block.get("timestamp").unwrap().as_u64().unwrap();

    // Extracting "data" from event

    let from_address_field_element = event.data[0];
    let from_address = format!("{:#064x}", from_address_field_element);
    let to_address = format!("{:#064x}", event.data[1]);
    let contract_address = format!("{:#064x}", event.from_address);
    let transaction_hash = format!("{:#064x}", event.transaction_hash);

    let token_id_low = event.data[2];
    let token_id_high = event.data[3];

    let token_id = TokenId {
        low: token_id_low,
        high: token_id_high,
    };

    let formated_token_id = token_id.format();

    let block_number = event.block_number;
    let token_uri = get_token_uri(
        client,
        formated_token_id.low,
        formated_token_id.high,
        &contract_address,
        block_number,
    )
    .await;

    let token_owner = get_token_owner(
        client,
        token_id_low,
        token_id_high,
        contract_address.as_str(),
        block_number,
    )
    .await;

    info!(
        "Contract address: {} - Token ID: {} - Token URI: {} - Block number: {}",
        contract_address, formated_token_id.token_id, token_uri, block_number
    );

    if from_address_field_element == FieldElement::ZERO {
        info!(
        "\n\n=== MINT DETECTED ===\n\nContract address: {} - Token ID: {} - Token URI: {} - Block number: {}\n\n===========\n\n",
        contract_address, formated_token_id.token_id, token_uri, block_number
    );

        let transaction_data = TransactionData {
            timestamp,
            block_number,
            from_address: from_address.to_string(),
            to_address: to_address.to_string(),
            hash: transaction_hash.to_string(),
        };

        let token_data = TokenData {
            padded_token_id: formated_token_id.padded_token_id.clone(),
            token_uri: token_uri.clone(),
            owner: token_owner.clone(),
            token_type: contract_type.to_string(),
            collection_address: contract_address.clone(),
        };

        process_mint_event(
            client,
            dynamo_db_client,
            formated_token_id.padded_token_id.as_str(),
            token_uri.as_str(),
            timestamp,
            token_data,
            transaction_data,
        )
        .await;
    } else {
        update_token(
            dynamo_db_client,
            contract_address.to_string(),
            formated_token_id.padded_token_id.as_str(),
            from_address.to_string(),
            to_address.to_string(),
            &timestamp.clone(),
            transaction_hash.to_string(),
        )
        .await?;
    }

    Ok(())
}
