use std::env;

use anyhow::Result;
use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Client;
use chrono::Utc;

pub async fn create_indexer(dynamo_client: &Client, task_id: &str) -> Result<()> {
    let indexer_table_name =
        env::var("ARK_INDEXER_TABLE_NAME").expect("ARK_INDEXER_TABLE_NAME must be set");
    let indexer_version = env::var("ARK_INDEXER_VERSION").unwrap_or(String::from("undefined"));
    let now = Utc::now();
    let unix_timestamp = now.timestamp();

    dynamo_client
        .put_item()
        .table_name(indexer_table_name)
        .item("PK", AttributeValue::S(format!("ECS_{}", task_id)))
        .item("SK", AttributeValue::S(unix_timestamp.to_string()))
        .item("status", AttributeValue::S(String::from("running")))
        .item("version", AttributeValue::S(String::from(indexer_version)))
        .send()
        .await?;

    Ok(())
}
