mod mint;
mod transfer;
mod utils;
use crate::transfer::process_transfers;
use aws_config::meta::region::RegionProviderChain;
use aws_lambda_events::event::kinesis::KinesisEvent;
use aws_sdk_dynamodb::Client as DynamoClient;
use base64::{
    alphabet,
    engine::{self, general_purpose},
    Engine as _,
};
use lambda_runtime::{service_fn, Error, LambdaEvent};
use log::{info, LevelFilter};
use reqwest::Client as ReqwestClient;
use simple_logger::SimpleLogger;

const CUSTOM_ENGINE: engine::GeneralPurpose =
    engine::GeneralPurpose::new(&alphabet::URL_SAFE, general_purpose::PAD);

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

    lambda_runtime::run(service_fn(|event: LambdaEvent<KinesisEvent>| {
        handle_kinesis_event(event, &reqwest_client, &dynamo_db_client)
    }))
    .await
}

async fn handle_kinesis_event(
    event: LambdaEvent<KinesisEvent>,
    reqwest_client: &ReqwestClient,
    dynamo_db_client: &DynamoClient,
) -> Result<(), Error> {
    log::info!("Event invocation: {:?}", event);
    let kinesis_event = event.payload;

    for record in kinesis_event.records {
        info!("Event ID: {:?}", record.event_id);

        let decoded_str = match String::from_utf8(record.kinesis.data.0) {
            Ok(s) => s,
            Err(_) => {
                info!("Invalid UTF-8 data");
                continue; // Skip this iteration if the data isn't valid UTF-8
            }
        };
        info!("Decoded data: {}", decoded_str);

        // Call your process_transfers function
        let partition_key = match &record.kinesis.partition_key {
            Some(key) => key,
            None => {
                info!("No partition key found in the record");
                continue; // Skip this iteration of the loop
            }
        };

        let parts: Vec<&str> = partition_key.split(':').collect();
        let contract_type = parts.get(0).unwrap_or(&""); // or provide a default

        let result = process_transfers(
            reqwest_client,
            dynamo_db_client,
            &decoded_str,
            contract_type,
        )
        .await;

        // Handle any errors from process_transfers
        if let Err(err) = result {
            log::error!("Failed to process transfer: {:?}", err);
        }
    }

    Ok(())
}
