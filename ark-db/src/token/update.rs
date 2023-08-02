use super::utils::{convert_transfer_to_map, Transfer, TransferType};
use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Error;
use dotenv::dotenv;
use std::env;

pub async fn update_token(
    dynamo_client: &aws_sdk_dynamodb::Client,
    collection_address: String,
    padded_token_id: &str,
    from_address: String,
    to_address: String,
    timestamp: &u64,
    transaction_hash: String,
) -> Result<(), Error> {
    dotenv().ok();
    let token_table = env::var("ARK_TOKENS_TABLE_NAME").expect("ARK_TOKENS_TABLE_NAME must be set");

    let contract_address_av = AttributeValue::S(collection_address.clone());
    let token_id_av = AttributeValue::S(padded_token_id.to_string());

    let request = dynamo_client
        .get_item()
        .table_name(&token_table)
        .key("address", contract_address_av.clone())
        .key("token_id", token_id_av.clone());

    let result = request.send().await?;

    let current_transfer = Transfer {
        from: from_address,
        to: to_address,
        kind: TransferType::Out,
        timestamp: timestamp.to_string(),
        transaction_hash,
    };

    let current_transfer_av = convert_transfer_to_map(&current_transfer);

    match &result.item {
        // If the item exists, we need to update it
        Some(item) => {
            log::info!("item: {:?}", item);
            if let Some(transfers_av) = item.get("transfers") {
                let mut transfers = transfers_av.as_l().unwrap().clone();
                transfers.push(current_transfer_av.clone());
                let request = dynamo_client
                    .update_item()
                    .table_name(token_table)
                    .key("address", AttributeValue::S(collection_address.clone()))
                    .key("token_id", AttributeValue::S(padded_token_id.to_string()))
                    .update_expression("SET transfers = :transfers")
                    .expression_attribute_values(":transfers", AttributeValue::L(transfers));
                request.send().await?;
            }
        }
        None => {
            let transfers_av = AttributeValue::L(vec![current_transfer_av]);
            let request = dynamo_client
                .put_item()
                .table_name(&token_table)
                .item("address", contract_address_av.clone())
                .item("token_id", token_id_av.clone())
                .item("transfers", transfers_av);
            request.send().await?;
        }
    }
    Ok(())
}
