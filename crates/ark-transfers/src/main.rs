mod mint;
mod transfer;
mod utils;
use std::env;

use crate::transfer::process_transfers;
use ark_starknet::{client2::StarknetClient, collection_manager::CollectionManager};
use aws_config::meta::region::RegionProviderChain;
use aws_lambda_events::event::kinesis::KinesisEvent;
use aws_sdk_dynamodb::Client as DynamoClient;
use lambda_runtime::{service_fn, Error, LambdaEvent};
use log::{error, info, LevelFilter};
use reqwest::Client as ReqwestClient;
use simple_logger::SimpleLogger;

#[tokio::main]
async fn main() -> Result<(), Error> {
    SimpleLogger::new()
        .env()
        .with_level(LevelFilter::Info)
        .init()
        .unwrap();

    let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
    let config = aws_config::from_env().region(region_provider).load().await;
    // Initialization: Create the necessary clients for services
    let reqwest_client = ReqwestClient::new();
    let dynamo_db_client = DynamoClient::new(&config);

    let rpc_endpoint_url = env::var("RPC_PROVIDER").expect("RPC_PROVIDER must be set");
    let starknet_client = StarknetClient::new(&rpc_endpoint_url.clone())?;
    let collection_manager = CollectionManager::new(starknet_client);

    lambda_runtime::run(service_fn(|event: LambdaEvent<KinesisEvent>| {
        process_kinesis_records(
            &collection_manager,
            event,
            &reqwest_client,
            &dynamo_db_client,
        )
    }))
    .await
}

async fn process_kinesis_records(
    collection_manager: &CollectionManager,
    event: LambdaEvent<KinesisEvent>,
    reqwest_client: &ReqwestClient,
    dynamo_db_client: &DynamoClient,
) -> Result<(), Error> {
    log::info!("Event invocation: {:?}", event);
    let kinesis_payload = event.payload;

    info!("Kinesis Event Records: {:?}", kinesis_payload.records.len());

    for record in kinesis_payload.records {
        info!("Event ID: {:?}", record.event_id);

        let decoded_data = match String::from_utf8(record.kinesis.data.0) {
            Ok(s) => s,
            Err(_) => {
                info!("Invalid UTF-8 data");
                continue; // Skip this iteration if the data isn't valid UTF-8
            }
        };
        info!("Decoded data: {}", decoded_data);

        // Call your process_transfers function
        let record_partition_key = match &record.kinesis.partition_key {
            Some(key) => key,
            None => {
                info!("No partition key found in the record");
                continue; // Skip this iteration of the loop
            }
        };

        let partition_key_parts: Vec<&str> = record_partition_key.split(':').collect();
        let contract_type = partition_key_parts.get(0).unwrap_or(&""); // or provide a default

        match process_transfers(
            collection_manager,
            reqwest_client,
            dynamo_db_client,
            &decoded_data,
            contract_type,
        )
        .await
        {
            Ok(()) => {}
            Err(err) => {
                error!("Failed to process transfer: {:?}", err)
            }
        }
    }

    Ok(())
}
