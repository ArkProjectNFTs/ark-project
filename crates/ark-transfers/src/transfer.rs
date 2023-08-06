use super::mint::{process_mint_event, TokenData, TransactionData};
use super::utils::get_token_uri;
use anyhow::{anyhow, Result};
use ark_db::owners::create::create_token_owner;
use ark_db::owners::delete::{delete_token_owner, DeleteTokenOwnerData};
use ark_db::owners::get::get_owner_block_number;
use ark_db::token::get::get_token;
use ark_db::token_event::create::{create_token_event, TokenEvent};
use ark_starknet::client::get_block_with_txs;
use ark_starknet::collection_manager::CollectionManager;
use ark_starknet::utils::{FormattedStarknetU256, StarknetU256};
use aws_sdk_dynamodb::Client as DynamoClient;
use log::{debug, info, warn};
use reqwest::Client as ReqwestClient;
use starknet::core::types::{EmittedEvent, FieldElement};

pub async fn process_transfers(
    collection_manager: &CollectionManager,
    client: &ReqwestClient,
    dynamo_db_client: &DynamoClient,
    value: &str,
    contract_type: &str,
) -> Result<()> {
    info!("Processing transfers: {:?}", value);

    //let data = str::from_utf8(&value.as_bytes())?;
    let event: EmittedEvent = serde_json::from_str(value)?;

    // Get block info
    let block = get_block_with_txs(client, event.block_number)
        .await
        .unwrap();
    let timestamp = block.get("timestamp").unwrap().as_u64().unwrap();

    if event.data.len() < 4 {
        return Err(anyhow!("Invalid event data"));
    }

    // Extracting "data" from event
    let from_address_field_element = event.data[0];
    let from_address = format!("{:#064x}", from_address_field_element);
    let to_address = format!("{:#064x}", event.data[1]);
    let contract_address = format!("{:#064x}", event.from_address);
    let transaction_hash = format!("{:#064x}", event.transaction_hash);

    let token_id_low = event.data[2];
    let token_id_high = event.data[3];

    let token_id = StarknetU256 {
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
    let token_owner = match collection_manager
        .get_token_owner(event.from_address, token_id_low, token_id_high, None)
        .await
    {
        Ok(result) if !result.is_empty() => {
            let token_owner_fe = &result[0];
            debug!("Token owner (field element): {:?}", token_owner_fe);
            format!("{:#064x}", token_owner_fe)
        }
        Ok(_) => {
            warn!("Empty token owner");
            "".to_string()
        }
        Err(error) => {
            warn!("Failed to get token owner: {:?}", error);
            "".to_string()
        }
    };

    info!(
        "\n\n\t=== TRANSFER DETECTED ===\n\n\tContract address: {}\n\tToken ID: {}\n\tToken URI: {}\n\tBlock number: {}\n\tFrom: {}\n\tTo: {}\n\tTx hash: {}\n\t Token owner: {}\n\n",
        contract_address, formated_token_id.value_str, token_uri, block_number, from_address, to_address, transaction_hash, token_owner
    );

    if from_address_field_element == FieldElement::ZERO {
        info!(
        "\n\n\t=== MINT DETECTED ===\n\n\tContract address: {}\n\t Token ID: {}\n\tToken URI: {}\n\tBlock number: {}\n\n",
        contract_address, formated_token_id.value_str, token_uri, block_number
    );

        let transaction_data = TransactionData {
            timestamp,
            block_number,
            from_address: from_address.to_string(),
            to_address: to_address.to_string(),
            hash: transaction_hash.to_string(),
        };

        let token_data = TokenData {
            padded_token_id: formated_token_id.padded_value.clone(),
            token_uri: token_uri.clone(),
            owner: token_owner.clone(),
            token_type: contract_type.to_string(),
            collection_address: contract_address.clone(),
        };

        process_mint_event(
            client,
            dynamo_db_client,
            formated_token_id.padded_value.as_str(),
            token_uri.as_str(),
            timestamp,
            token_data,
            transaction_data,
        )
        .await?;

        create_token_owner(
            dynamo_db_client,
            contract_address.as_str(),
            formated_token_id.value_str.as_str(),
            formated_token_id.padded_value.as_str(),
            to_address.as_str(),
            block_number,
        )
        .await?;
    } else {
        let get_token_result = get_token(
            dynamo_db_client,
            contract_address.clone(),
            formated_token_id.padded_value.clone(),
        )
        .await;

        let (token_image, token_name) = match get_token_result {
            Ok(query_result) => match query_result {
                Some(token_result_hashmap) => {
                    let normalized_metadata_av = token_result_hashmap.get("normalized_metadata");

                    match normalized_metadata_av {
                        Some(normalized_metadata_av) => {
                            let normalized_metadata = normalized_metadata_av.as_m().unwrap();

                            let image_uri = normalized_metadata
                                .get("image")
                                .map(|value| value.as_s().unwrap().to_string());

                            let name = normalized_metadata
                                .get("name")
                                .map(|value| value.as_s().unwrap().to_string());

                            (image_uri, name)
                        }
                        None => (None, None),
                    }
                }
                None => (None, None),
            },
            Err(_err) => (None, None),
        };

        let token_event = TokenEvent {
            address: contract_address.clone(),
            timestamp,
            block_number,
            event_type: "transfer".to_string(),
            from_address: from_address.to_string(),
            padded_token_id: formated_token_id.padded_value.clone(),
            token_uri: token_uri.clone(),
            to_address: to_address.to_string(),
            transaction_hash: transaction_hash.clone(),
            token_type: contract_type.to_string(),
            token_image,
            token_name,
            ..Default::default()
        };

        create_token_event(dynamo_db_client, token_event).await?;
        update_token_owner(
            dynamo_db_client,
            contract_address,
            formated_token_id,
            from_address,
            to_address,
            block_number,
        )
        .await?
    }

    Ok(())
}

async fn update_token_owner(
    dynamo_db_client: &DynamoClient,
    contract_address: String,
    formatted_token_id: FormattedStarknetU256,
    from_address: String,
    to_address: String,
    block_number: u64,
) -> Result<()> {
    if let Some(owner_block_number) = get_owner_block_number(
        dynamo_db_client,
        contract_address.clone(),
        formatted_token_id.value_str.clone(),
        from_address.clone(),
    )
    .await
    {
        if owner_block_number < block_number {
            let old_owner_data = DeleteTokenOwnerData {
                address: contract_address.clone(),
                padded_token_id: formatted_token_id.padded_value.clone(),
                owner: from_address.to_string(),
            };
            delete_token_owner(dynamo_db_client, old_owner_data).await;
        }
    };

    match get_owner_block_number(
        dynamo_db_client,
        contract_address.clone(),
        formatted_token_id.value_str.clone(),
        to_address.clone(),
    )
    .await
    {
        Some(owner_block_number) => {
            if owner_block_number < block_number {
                create_token_owner(
                    dynamo_db_client,
                    contract_address.as_str(),
                    formatted_token_id.value_str.as_str(),
                    formatted_token_id.padded_value.as_str(),
                    to_address.as_str(),
                    block_number,
                )
                .await?;
            }
        }
        _ => {
            create_token_owner(
                dynamo_db_client,
                contract_address.as_str(),
                formatted_token_id.value_str.as_str(),
                formatted_token_id.padded_value.as_str(),
                to_address.as_str(),
                block_number,
            )
            .await?;
        }
    };

    Ok(())
}
