use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};

pub struct Item {
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

pub async fn add_collection_item(client: &Client, item: Item, table: &String) -> Result<(), Error> {
    let name_av = AttributeValue::S(item.name);
    let total_supply_av = AttributeValue::S(item.total_supply);
    let symbol_av = AttributeValue::S(item.symbol);
    let address_av = AttributeValue::S(item.address);
    let contract_deployer_av = AttributeValue::S(item.contract_deployer);
    let deployed_block_number_av = AttributeValue::S(item.deployed_block_number);
    let contract_type_av = AttributeValue::S(item.contract_type);

    let request = client
        .put_item()
        .table_name(table)
        .item("name", name_av)
        .item("total_supply", total_supply_av)
        .item("symbol", symbol_av)
        .item("address", address_av)
        .item("contract_deployer", contract_deployer_av)
        .item("deployed_block_number", deployed_block_number_av)
        .item("type", contract_type_av);

    request.send().await?;

    Ok(())
}
