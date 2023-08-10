use aws_sdk_kinesis::error::SdkError;
use aws_sdk_kinesis::operation::put_record::PutRecordError;
use aws_sdk_kinesis::primitives::Blob;
use aws_sdk_kinesis::Client as KinesisClient;
use aws_smithy_http::body::SdkBody;
use http::response::Response;
use log::{error, info};

pub async fn send_to_kinesis(
    client: &KinesisClient,
    stream: &str,
    key: &str,
    data: &str,
    contract_type: &str,
) -> Result<(), SdkError<PutRecordError, Response<SdkBody>>> {
    let blob = Blob::new(data);

    let partition_key = format!("{}:{}", contract_type, key);

    info!("Sending data to {} stream: {}", partition_key, data);

    let request = client
        .put_record()
        .data(blob)
        .partition_key(&partition_key)
        .stream_name(stream);

    let result = request.send().await;
    match result {
        Ok(_) => {
            info!("Successfully added record to Kinesis stream {:?}", result);
            Ok(())
        }
        Err(err) => {
            // Log the error
            error!("Error while adding record to Kinesis stream: {:?}", err);
            Err(err)
        }
    }
}
