use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::{Client, Error};
use log::info;

pub async fn update_collection(
    dynamo_client: &Client,
    address: String,
    name: String,
    symbol: String,
) -> Result<(), Error> {
    info!("update_collection: {} {} {}", address, name, symbol);

    match dynamo_client
        .update_item()
        .table_name("ark_mainnet_collections")
        .key("name", AttributeValue::S(name))
        .key("symbol", AttributeValue::S(symbol))
        .update_expression("set address = :address")
        .expression_attribute_values(":address", AttributeValue::S(address))
        .send()
        .await
    {
        Ok(_) => {
            info!("update_collection: success");
        }
        Err(e) => {
            info!("update_collection: error {:?}", e);
        }
    }

    Ok(())
}
