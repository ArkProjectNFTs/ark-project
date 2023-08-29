use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Client;
use std::env;

pub async fn get_owner_block_number(
    dynamo_client: &Client,
    contract_address: String,
    token_id: String,
    owner_address: String,
) -> Option<u64> {
    let token_table =
        env::var("ARK_TOKENS_OWNERS_TABLE_NAME").expect("ARK_TOKENS_OWNERS_TABLE_NAME must be set");

    let response = dynamo_client
        .get_item()
        .table_name(&token_table)
        .key("owner_address", AttributeValue::S(owner_address))
        .key(
            "token_ref",
            AttributeValue::S(format!("{}:{}", contract_address, token_id)),
        )
        .send()
        .await;

    if let Ok(value) = response {
        if let Some(item) = value.item {
            if let Some(block_number_str) = item.get("block_number") {
                if let Ok(bn) = block_number_str.as_n() {
                    return bn.parse::<u64>().ok();
                }
            }
        }
    }

    None
}
