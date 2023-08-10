use lambda_runtime::{service_fn, Error, LambdaEvent};
use aws_lambda_events::event::kinesis::KinesisEvent;
use log::info;

#[tokio::main]
async fn main() -> Result<(), Error> {
    lambda_runtime::run(service_fn(handle_kinesis_event)).await
}

async fn handle_kinesis_event(event: LambdaEvent<KinesisEvent>) -> Result<(), Error> {
    info!("Event invocation: {:?}", event);
    // The actual Kinesis event data is in the payload field
    // let kinesis_event = event.payload;

    // // Iterate over each Kinesis record
    // for record in kinesis_event.records {
    //     info!("Event ID: {:?}", record);
    //     // Kinesis records are Base64 encoded using the URL_SAFE config

    //     // let payload: serde_json::Value = serde_json::from_slice(&decoded).unwrap();
    
    //     // Do something with the decoded payload
    //     // info!("Processed record with payload: {:?}", payload);
    // }    

    Ok(())
}
