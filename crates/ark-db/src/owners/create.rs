use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Error;
use std::env;

pub struct CreateTokenOwnerData {
  pub address: String,
  pub padded_token_id: String,
  pub owner: String,
}

pub async fn create_token_owner(
    dynamo_client: &aws_sdk_dynamodb::Client,
    token_owner_data: CreateTokenOwnerData,
) -> Result<Option<String>, Error> {
    let token_table = env::var("ARK_TOKENS_OWNERS_TABLE_NAME").expect("ARK_TOKENS_OWNERS_TABLE_NAME must be set");

    // attributes values
    let address_av = AttributeValue::S(token_owner_data.address);
    let token_id_av = AttributeValue::S(token_owner_data.padded_token_id);
    let owner_av = AttributeValue::S(token_owner_data.owner);
  
    let request = dynamo_client
        .put_item()
        .table_name(&token_table)
        .item("owner_address", owner_av.clone())
        .item("contract_address", address_av.clone())
        .item("token_id", token_id_av.clone());
    request.send().await?;
    Ok(None)
}
