use ark_db::marketplaces::update::update_marketplace_index;
use ark_db::token_event::create::{create_token_event, TokenEvent};
use ark_metadata::get::get_metadata;
use ark_metadata::utils::sanitize_uri;
use ark_starknet::client::{get_contract_type, get_token_uri};
use ark_starknet::utils::StarknetU256;
use aws_sdk_dynamodb::Client as DynamoClient;
use log::{error, info};
use reqwest::Client as ReqwestClient;
use starknet::core::types::MaybePendingBlockWithTxHashes::Block;
use starknet::core::types::MaybePendingTransactionReceipt::{self};
use starknet::core::types::{Event, TransactionReceipt};

use starknet::{
    core::{
        types::{BlockId, EventFilter, FieldElement},
        utils::get_selector_from_name,
    },
    providers::{jsonrpc::HttpTransport, JsonRpcClient, Provider},
};
use std::env;
use std::error::Error;
use std::str::FromStr;

use crate::utils::fetch_currency_data;

pub async fn fetch_unframed_events(
    rpc_client: JsonRpcClient<HttpTransport>,
    dynamo_client: DynamoClient,
    reqwest_client: ReqwestClient,
    from_block: BlockId,
    to_block: BlockId,
    address: FieldElement,
    eth_token_address: &str,
) -> Result<(), Box<dyn Error>> {
    let mut keys: Vec<Vec<FieldElement>> = Vec::new();

    let executed_order_selector = get_selector_from_name("OrderExecuted")?;
    keys.push(vec![executed_order_selector]);

    let filter = EventFilter {
        from_block: Some(from_block),
        to_block: Some(to_block),
        address: Some(address),
        keys: Some(keys),
    };

    let dest_block = match rpc_client.get_block_with_tx_hashes(to_block).await {
        Ok(Block(block)) => Some(block.block_number),
        _ => None,
    };

    // let mut events = vec![];

    let chunk_size = 100;
    let mut continuation_token: Option<String> = None;

    loop {
        // === Exemple of event_page.events ===

        // {
        //     "from_address": "0x051734077ba7baf5765896c56ce10b389d80cdcee8622e23c0556fb49e82df1b",
        //     "keys": [
        //       "0x01390fd803c110ac71730ece1decfc34eb1d0088e295d4f1b125dda1e0c5b9ff"
        //     ],
        //     "data": [
        //       "0x0000000000000000000000000000000000000000000000000000000000000000",
        //       "0x042f834bc0c91f746aceaa44bf399efff1a4c6586d9b586b0b739b1da0493c5d"
        //     ],
        //     "block_hash": "0x025afec64c65f649600bedc39e19f482b26966b26d6a90d5c01edb16dadd0d2e",
        //     "block_number": "105658",
        //     "transaction_hash": "0x06ce4aada75d81794a2b7e02f8f63675605e63e8435d2ef73c8f1804baecf241"
        //   }

        let event_page = rpc_client
            .get_events(filter.clone(), continuation_token, chunk_size)
            .await?;

        // Iterate over event_page.events

        info!("events count: {:?}", event_page.events.len());

        for event in event_page.events {
            if event.keys.contains(&executed_order_selector) {
                let formatted_amount = StarknetU256 {
                    low: event.data[0],
                    high: event.data[1],
                }
                .format();

                let formatted_price = StarknetU256 {
                    low: event.data[2],
                    high: event.data[3],
                }
                .format();

                let formatted_total_fee = StarknetU256 {
                    low: event.data[4],
                    high: event.data[5],
                }
                .format();

                let currency_contract = event.data[6];
                let currency_data = fetch_currency_data(&rpc_client, currency_contract).await;

                let transaction_hash_hex: String = format!("{:#064x}", event.transaction_hash);
                info!("transaction_hash_hex: {:?}", transaction_hash_hex);

                let maybe_receipt = rpc_client
                    .get_transaction_receipt(event.transaction_hash)
                    .await?;

                let (events, block_number) = match maybe_receipt {
                    MaybePendingTransactionReceipt::Receipt(receipt_tbd) => match receipt_tbd {
                        TransactionReceipt::Invoke(r) => (r.events, r.block_number),
                        _ => (vec![], 0),
                    },
                    _ => (vec![], 0),
                };

                info!("block number: {:?}", block_number);

                let transfer_selector = get_selector_from_name(&"Transfer").unwrap();
                let eth_token_address_field = FieldElement::from_str(eth_token_address).unwrap();

                let filtered_events: Vec<Event> = events
                    .into_iter()
                    .filter(|event| {
                        event.keys.contains(&transfer_selector)
                            && event.from_address != eth_token_address_field
                    })
                    .collect();

                let nft_transfer_event = filtered_events[0].clone();
                let contract_address_field = nft_transfer_event.from_address;
                let from_address_field = nft_transfer_event.data[0].clone();
                let to_address_field = nft_transfer_event.data[1].clone();
                let token_id_low = nft_transfer_event.data[2].clone();
                let token_id_high = nft_transfer_event.data[3].clone();
                let token_id = StarknetU256 {
                    low: token_id_low,
                    high: token_id_high,
                };
                let formatted_token_id = token_id.format();

                info!("Sale detected: {}", formatted_token_id.padded_value);

                let contract_address = format!("{:#064x}", contract_address_field);
                let contract_type =
                    get_contract_type(&reqwest_client, contract_address.as_str(), block_number)
                        .await;

                let block_result = rpc_client
                    .get_block_with_tx_hashes(BlockId::Number(block_number))
                    .await?;

                let token_uri = get_token_uri(
                    &reqwest_client,
                    formatted_token_id.low,
                    formatted_token_id.high,
                    &contract_address,
                    block_number,
                )
                .await;

                let (metadata_uri, initial_metadata_uri) = sanitize_uri(token_uri.as_str()).await;
                let metadata = get_metadata(
                    &reqwest_client,
                    metadata_uri.as_str(),
                    initial_metadata_uri.as_str(),
                )
                .await;

                let mut token_name: String = "".to_string();
                let mut token_image: String = "".to_string();

                match metadata {
                    Ok((_metadata, normalized_metadata)) => {
                        token_name = normalized_metadata.name.clone();
                        token_image = normalized_metadata.image.clone();
                    }
                    _ => {}
                }

                if let Block(block) = block_result {
                    let token_event = TokenEvent {
                        address: contract_address,
                        block_number,
                        event_type: "sale".to_string(),
                        from_address: format!("{:#064x}", from_address_field),
                        padded_token_id: formatted_token_id.padded_value,
                        timestamp: block.timestamp,
                        to_address: format!("{:#064x}", to_address_field),
                        token_type: contract_type,
                        token_name,
                        token_image,
                        token_uri,
                        transaction_hash: transaction_hash_hex,
                        marketplace: Some("unframed".to_string()),
                        currency_contract: Some(currency_data.contract_address),
                        currency_symbol: Some(currency_data.symbol),
                        price: Some(formatted_price.padded_value),
                        total_fee: Some(formatted_total_fee.padded_value),
                        amount: Some(formatted_amount.padded_value),
                    };

                    let create_token_event_result =
                        create_token_event(&dynamo_client, token_event).await;
                    match create_token_event_result {
                        Ok(_) => info!("Token event created"),
                        Err(e) => error!("Error creating token event: {:?}", e),
                    }
                }
            }
        }

        continuation_token = event_page.continuation_token;
        println!("Continuation token: {:?}", continuation_token);

        if continuation_token.is_none() {
            if let Some(block_number) = dest_block {
                let contract_address = format!("{:#064x}", address);

                info!("Updating marketplace index: {:?}", contract_address);

                let marketplaces_table_name = env::var("ARK_TOKENS_MARKETPLACES_TABLE_NAME")
                    .unwrap_or("ark_mainnet_marketplaces".to_string());

                let result = update_marketplace_index(
                    &dynamo_client,
                    &marketplaces_table_name,
                    &contract_address,
                    block_number,
                )
                .await;

                match result {
                    Ok(_) => info!("Marketplace index updated"),
                    Err(e) => error!("Error updating marketplace index: {:?}", e),
                }

                break;
            }
        }
    }
    Ok(())
}
