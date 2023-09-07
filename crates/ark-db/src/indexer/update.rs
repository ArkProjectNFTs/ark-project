use std::env;

use anyhow::Result;
use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Client;
use chrono::Utc;

pub async fn update_indexer(
    dynamo_client: &Client,
    task_id: &str,
    status: String,
    from: Option<u64>,
    to: Option<u64>,
    indexation_progress: Option<String>,
) -> Result<()> {
    let indexer_table_name =
        env::var("ARK_INDEXER_TABLE_NAME").expect("ARK_INDEXER_TABLE_NAME must be set");
    let indexer_version = env::var("ARK_INDEXER_VERSION").unwrap_or(String::from("undefined"));
    let now = Utc::now();
    let unix_timestamp = now.timestamp();

    let mut request = dynamo_client
        .put_item()
        .table_name(indexer_table_name)
        .item("PK", AttributeValue::S(String::from("Indexer")))
        .item(
            "SK",
            AttributeValue::S(format!("{}_{}", indexer_version, task_id.to_string())),
        )
        .item("status", AttributeValue::S(status))
        .item("last_update", AttributeValue::N(unix_timestamp.to_string()))
        .item("version", AttributeValue::S(indexer_version))
        .item("indexer", AttributeValue::S(task_id.to_string()));

    if from.is_some() {
        request = request.item("from", AttributeValue::N(from.unwrap().to_string()));
    }

    if to.is_some() {
        request = request.item("to", AttributeValue::N(to.unwrap().to_string()));
    }

    if indexation_progress.is_some() {
        request = request.item(
            "indexation_progress",
            AttributeValue::N(indexation_progress.unwrap().to_string()),
        );
    }

    request.send().await?;

    Ok(())
}

pub async fn update_block(dynamo_client: &Client, task_id: &str, block_number: u64) -> Result<()> {
    let indexer_table_name =
        env::var("ARK_INDEXER_TABLE_NAME").expect("ARK_INDEXER_TABLE_NAME must be set");
    let indexer_version = env::var("ARK_INDEXER_VERSION").unwrap_or(String::from("undefined"));
    let now = Utc::now();
    let unix_timestamp = now.timestamp();

    dynamo_client
        .put_item()
        .table_name(indexer_table_name)
        .item("PK", AttributeValue::S(format!("Block_{}", block_number)))
        .item("SK", AttributeValue::S(indexer_version))
        .item("is_fetched", AttributeValue::Bool(true))
        .item("last_update", AttributeValue::N(unix_timestamp.to_string()))
        .item("indexer", AttributeValue::S(task_id.to_string()))
        .send()
        .await?;

    Ok(())
}
