use aws_sdk_dynamodb::types::AttributeValue;
use std::env;

pub struct DeleteTokenOwnerData {
    pub address: String,
    pub padded_token_id: String,
    pub owner: String,
}

pub async fn delete_token_owner(
    dynamo_client: &aws_sdk_dynamodb::Client,
    token_owner_data: DeleteTokenOwnerData,
) {
    let token_table =
        env::var("ARK_TOKENS_OWNERS_TABLE_NAME").expect("ARK_TOKENS_OWNERS_TABLE_NAME must be set");

    // attributes values
    let address_av = AttributeValue::S(token_owner_data.address);
    let token_id_av = AttributeValue::S(token_owner_data.padded_token_id);
    let owner_av = AttributeValue::S(token_owner_data.owner);

    let request = dynamo_client
        .delete_item()
        .table_name(&token_table)
        .key("owner_address", owner_av.clone())
        .key("contract_address", address_av.clone())
        .key("token_id", token_id_av.clone());

    match request.send().await {
        Ok(_) => println!("Deleted item from table"),
        Err(e) => println!("Failed to delete item: {}", e),
    }
}
