use aws_sdk_kinesis::{Client, Error};
use aws_sdk_kinesis::config::Region;
use aws_sdk_kinesis::operation::put_record::PutRecordInput;
use std::str::FromStr;

pub async fn send_to_kinesis(event_data: String, stream_name: String) -> Result<(), Error> {
    let region = Region::from_str("your region").unwrap();
    let client = Client::new(&region);

    let put_record_input = PutRecordInput::builder()
        .stream_name(stream_name)
        .data(event_data.as_bytes())
        .build();

    match client.put_record(put_record_input).send().await {
        Ok(_) => Ok(()),
        Err(e) => Err(e)
    }
}