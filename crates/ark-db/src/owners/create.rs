use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Error;
use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

pub async fn create_token_owner(
    dynamo_client: &aws_sdk_dynamodb::Client,
    address: &str,
    token_id: &str,
    padded_token_id: &str,
    owner: &str,
    block_number: u64,
) -> Result<Option<String>, Error> {
    let token_table =
        env::var("ARK_TOKENS_OWNERS_TABLE_NAME").expect("ARK_TOKENS_OWNERS_TABLE_NAME must be set");

    // attributes values
    let address_av = AttributeValue::S(address.to_string());
    let token_id_av = AttributeValue::S(padded_token_id.to_string());
    let owner_av = AttributeValue::S(owner.to_string());
    let token_ref_av = AttributeValue::S(format!("{}:{}", address, token_id));
    let block_number_av = AttributeValue::N(block_number.to_string());
    let last_update_av = AttributeValue::N(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_secs()
            .to_string(),
    );

    let request = dynamo_client
        .put_item()
        .table_name(&token_table)
        .item("owner_address", owner_av.clone())
        .item("token_ref", token_ref_av.clone())
        .item("contract_address", address_av.clone())
        .item("block_number", block_number_av.clone())
        .item("last_update", last_update_av.clone())
        .item("token_id", token_id_av.clone());

    request.send().await?;
    Ok(None)
}
