use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_sdk_dynamodb::Error;
use std::collections::HashMap;
use std::env;

pub async fn get_token(
    client: &DynamoClient,
    address: String,
    padded_token_id: String,
) -> Result<Option<HashMap<String, AttributeValue>>, Error> {
    let token_table = env::var("ARK_TOKENS_TABLE_NAME").expect("ARK_TOKENS_TABLE_NAME must be set");

    let request = client
        .get_item()
        .table_name(token_table)
        .key("address", AttributeValue::S(address))
        .key("token_id", AttributeValue::S(padded_token_id))
        .send()
        .await?;

    Ok(request.item)
}
