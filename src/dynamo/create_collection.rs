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

pub async fn create_collection(
    client: &Client,
    item: CollectionItem,
    table_name: &str,
    token_address: &str,
    token_type: &str,
) -> Result<(), Error> {
    println!("add_collection_item {:?}", item.address);

    let result = client
        .get_item()
        .key("address", AttributeValue::S(token_address.to_string()))
        .key("collection_type", AttributeValue::S(token_type.to_string()))
        .table_name(table_name)
        .send()
        .await?;

    // If results returns 0 results
    if result.item.is_none() {
        let _ = client
            .put_item()
            .table_name(table_name)
            .item("address", AttributeValue::S(item.address))
            .item("collection_type", AttributeValue::S(item.contract_type))
            .send()
            .await?;
    }

    Ok(())
}
