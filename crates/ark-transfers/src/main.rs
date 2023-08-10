use lambda_runtime::{service_fn, Error, LambdaEvent};
use aws_lambda_events::event::kinesis::KinesisEvent;
use log::info;
use base64::alphabet::STANDARD;

#[tokio::main]
async fn main() -> Result<(), Error> {
    lambda_runtime::run(service_fn(handle_kinesis_event)).await
}

async fn handle_kinesis_event(event: LambdaEvent<KinesisEvent>) -> Result<(), Error> {
    // The actual Kinesis event data is in the payload field
    let kinesis_event = event.payload;

    // Iterate over each Kinesis record
    for record in kinesis_event.records {
        // Kinesis records are Base64 encoded using the STANDARD config
        let decoded = base64::decode_config(&record.kinesis.data, STANDARD).unwrap();
        let payload: serde_json::Value = serde_json::from_slice(&decoded).unwrap();
    
        // Do something with the decoded payload
        info!("Processed record with payload: {:?}", payload);
    }

    Ok(())
}
