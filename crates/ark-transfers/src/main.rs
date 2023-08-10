use aws_lambda_events::event::kinesis::KinesisEvent;
use base64;
use base64::{engine::general_purpose, Engine as _};
use lambda_runtime::{service_fn, Error, LambdaEvent};
use log::info;
use log::LevelFilter;
use simple_logger::SimpleLogger;

#[tokio::main]
async fn main() -> Result<(), Error> {
    SimpleLogger::new()
        .env()
        .with_level(LevelFilter::Info)
        .init()
        .unwrap();
    lambda_runtime::run(service_fn(handle_kinesis_event)).await
}

async fn handle_kinesis_event(event: LambdaEvent<KinesisEvent>) -> Result<(), Error> {
    log::info!("Event invocation: {:?}", event);
    // The actual Kinesis event data is in the payload field
    let kinesis_event = event.payload;

    for record in kinesis_event.records {
        info!("Event ID: {:?}", record.event_id);

        // Decode the base64 data
        match general_purpose::STANDARD.decode(&record.kinesis.data.0) {
            Ok(decoded_data) => {
                let decoded_str = String::from_utf8(decoded_data)
                    .unwrap_or_else(|_| "Invalid UTF-8 data".to_string());
                // Log the decoded data
                info!("Decoded data: {}", decoded_str);
            }
            Err(e) => {
                info!("Failed to decode base64 data: {:?}", e);
            }
        }
    }

    Ok(())
}
