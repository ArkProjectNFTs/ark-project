use lambda_runtime::{service_fn, Error, LambdaEvent};
use serde_json::Value;
use aws_lambda_events::event::kinesis::KinesisEvent;
use log::info;

#[tokio::main]
async fn main() -> Result<(), Error> {
    lambda_runtime::run(service_fn(handle_kinesis_event)).await
}

async fn handle_kinesis_event(event: LambdaEvent<KinesisEvent>) -> Result<(), Error> {
    // Iterate over each Kinesis record
    for record in event.data.records {
        // Kinesis records are Base64 encoded
        let decoded = base64::decode(&record.kinesis.data).unwrap();
        let payload: Value = serde_json::from_slice(&decoded).unwrap();

        // Do something with the decoded payload
        info!("Processed record with payload: {:?}", payload);
    }

    Ok(())
}
