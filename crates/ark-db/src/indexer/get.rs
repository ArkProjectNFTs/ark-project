use anyhow::{anyhow, Result};
use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use std::env;

pub async fn get_block(dynamo_client: &Client, block_number: u64) -> Result<bool, Error> {
    let indexer_table_name =
        env::var("ARK_INDEXER_TABLE_NAME").expect("ARK_INDEXER_TABLE_NAME must be set");
    let partition_key = format!("BLOCK#{}", block_number);

    let request = dynamo_client
        .query()
        .table_name(indexer_table_name)
        .key_condition_expression("#PK = :PK")
        .expression_attribute_names("#PK", "PK")
        .expression_attribute_values(":PK", AttributeValue::S(partition_key));

    match request.send().await {
        Ok(value) => {
            if let Some(items) = value.items() {
                if let Some(item) = items.first() {
                    if let Some(is_fetched) = item.get("is_fetched") {
                        match is_fetched.as_bool() {
                            Ok(is_fetched_bool) => return Ok(*is_fetched_bool),
                            Err(_) => return Ok(false),
                        }
                    }
                }
            }
        }
        Err(e) => {
            println!(
                "Error requesting block number {} to the list of fetched blocks: {:?}",
                block_number, e
            );
        }
    }

    Ok(false)
}

pub async fn get_indexer_sk(dynamo_client: &Client, task_id: &str) -> Result<String> {
    let indexer_table_name =
        env::var("ARK_INDEXER_TABLE_NAME").expect("ARK_INDEXER_TABLE_NAME must be set");

    let result = dynamo_client
        .query()
        .table_name(indexer_table_name)
        .index_name("task_id_index")
        .key_condition_expression("#task_id = :task_id, #PK = :PK")
        .expression_attribute_names("#task_id", "task_id")
        .expression_attribute_names("#PK", "PK")
        .expression_attribute_values(":task_id", AttributeValue::S(task_id.to_string()))
        .expression_attribute_values(":PK", AttributeValue::S("INDEXER".to_string()))
        .limit(1)
        .send()
        .await?;

    if let Some(items) = result.items() {
        if let Some(item) = items.first() {
            if let Some(sk) = item.get("SK") {
                let res = sk.as_s().unwrap();
                return Ok(res.to_string());
            }
        }
    }

    Err(anyhow!("Indexer SK not found"))
}
