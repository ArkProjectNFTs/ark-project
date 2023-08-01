use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};

pub struct CollectionItem {
    pub address: String,
    pub contract_type: String,
}

#[derive(Debug, PartialEq)]
pub struct ItemOut {
    pub address: Option<AttributeValue>,
    pub contract_type: Option<AttributeValue>,
}

pub async fn add_collection_item(
    client: &Client,
    item: CollectionItem,
    table: &String,
) -> Result<(), Error> {
    let request = client
        .put_item()
        .table_name(table)
        .item("address", AttributeValue::S(item.address))
        .item("collection_type", AttributeValue::S(item.contract_type));

    request.send().await?;

    Ok(())
}