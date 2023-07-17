use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};

pub struct CollectionItem {
    pub name: String,
    pub total_supply: String,
    pub symbol: String,
    pub address: String,
    pub contract_deployer: String,
    pub deployed_block_number: String,
    pub contract_type: String,
}

#[derive(Debug, PartialEq)]
pub struct ItemOut {
    pub name: Option<AttributeValue>,
    pub total_supply: Option<AttributeValue>,
    pub symbol: Option<AttributeValue>,
    pub address: Option<AttributeValue>,
    pub contract_deployer: Option<AttributeValue>,
    pub deployed_block_number: Option<AttributeValue>,
    pub contract_type: Option<AttributeValue>,
}

fn attribute_string(value: String) -> AttributeValue {
    AttributeValue::S(value)
}

fn attribute_bool(value: bool) -> AttributeValue {
    AttributeValue::Bool(value)
}

pub async fn register_indexed_contract(
    client: &Client,
    contract_address: String,
    is_nft: bool,
) -> Result<(), Error> {
    let request = client
        .put_item()
        .table_name("ark_mainnet_indexed_contracts")
        .item("address", attribute_string(contract_address))
        .item("is_indexed", attribute_bool(true))
        .item("is_nft", attribute_bool(is_nft));

    request.send().await?;

    Ok(())
}

pub async fn register_collection_item(
    client: &Client,
    item: CollectionItem,
    table: &String,
) -> Result<(), Error> {
    let request = client
        .put_item()
        .table_name(table)
        .item("name", attribute_string(item.name))
        .item("total_supply", attribute_string(item.total_supply))
        .item("symbol", attribute_string(item.symbol))
        .item("address", attribute_string(item.address))
        .item(
            "contract_deployer",
            attribute_string(item.contract_deployer),
        )
        .item(
            "deployed_block_number",
            attribute_string(item.deployed_block_number),
        )
        .item("type", attribute_string(item.contract_type));

    request.send().await?;

    Ok(())
}
