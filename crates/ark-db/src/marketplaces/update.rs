use aws_sdk_dynamodb::{types::AttributeValue, Client as DynamoClient};
use chrono::Utc;

pub async fn update_marketplace_index(
    dynamo_client: &DynamoClient,
    table_name: &str,
    address: &str,
    block_number: u64,
) -> Result<(), Box<dyn std::error::Error>> {
    let dt = Utc::now();
    let timestamp: i64 = dt.timestamp();

    dynamo_client
        .update_item()
        .key("address", AttributeValue::S(address.to_string()))
        .table_name(table_name)
        .update_expression(
            "SET latest_update = :latest_update, last_indexed_block_number = :last_indexed_block_number",
        )
        .expression_attribute_values(":latest_update", AttributeValue::S(timestamp.to_string()))
        .expression_attribute_values(":last_indexed_block_number", AttributeValue::N(block_number.to_string()))
        .send()
        .await?;

    Ok(())
}
