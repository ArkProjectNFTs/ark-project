use aws_sdk_kinesis::Client as KinesisClient;
use aws_sdk_kinesis::error::SdkError;
use aws_sdk_kinesis::operation::put_record::PutRecordError;
use aws_sdk_kinesis::primitives::Blob;

pub async fn send_to_kinesis(
    client: &KinesisClient,
    stream: &str,
    key: &str,
    data: &str,
) -> Result<(), SdkError<PutRecordError>> {
    let blob = Blob::new(data);

    let request = client
        .put_record()
        .data(blob)
        .partition_key(key)
        .stream_name(stream);

    let result = request.send().await;
    match result {
        Ok(_) => {
            println!("Put data into stream.");
            Ok(())
        }
        Err(err) => {
            // Log the error
            eprintln!("Error while adding record to Kinesis stream: {:?}", err);

            // Optionally, you can propagate the error further up the call stack
            Err(err)
        }
    }
}
