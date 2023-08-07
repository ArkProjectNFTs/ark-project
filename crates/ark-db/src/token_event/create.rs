use anyhow::Result;
use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Client as DynamoClient;
use log::info;
use std::env;

#[derive(Debug, Clone, Default)]
pub struct TokenEvent {
    pub address: String,
    pub timestamp: u64,
    pub block_number: u64,
    pub event_type: String,
    pub from_address: String,
    pub padded_token_id: String,
    pub token_uri: String,
    pub to_address: String,
    pub transaction_hash: String,
    pub token_type: String,
    pub token_name: Option<String>,
    pub token_image: Option<String>,
    pub order_hash: Option<String>,
    pub price: Option<String>,
    pub marketplace: Option<String>,
    pub amount: Option<String>,
    pub total_fee: Option<String>,
    pub currency_contract: Option<String>,
    pub currency_symbol: Option<String>,
}
pub async fn create_token_event(
    dynamo_client: &DynamoClient,
    token_event: TokenEvent,
) -> Result<()> {
    info!("create_token_event: {:?}", token_event.address);

    let token_events_table_name =
        env::var("ARK_TOKENS_EVENTS_TABLE_NAME").expect("ARK_TOKENS_EVENTS_TABLE_NAME must be set");

    let mut result = dynamo_client
        .put_item()
        .table_name(token_events_table_name)
        .item("address", AttributeValue::S(token_event.address))
        .item(
            "event_timestamp",
            AttributeValue::N(token_event.timestamp.to_string()),
        )
        .item(
            "block_number",
            AttributeValue::N(token_event.block_number.to_string()),
        )
        .item("event_type", AttributeValue::S(token_event.event_type))
        .item("from_address", AttributeValue::S(token_event.from_address))
        .item("to_address", AttributeValue::S(token_event.to_address))
        .item("token_id", AttributeValue::S(token_event.padded_token_id))
        .item("token_uri", AttributeValue::S(token_event.token_uri))
        .item(
            "transaction_hash",
            AttributeValue::S(token_event.transaction_hash),
        )
        .item("collection_type", AttributeValue::S(token_event.token_type));

    if let Some(name) = &token_event.token_name {
        result = result.item("token_name", AttributeValue::S(name.clone()));
    }

    if let Some(image) = &token_event.token_image {
        result = result.item("token_image", AttributeValue::S(image.clone()));
    }

    if let Some(order_hash) = &token_event.order_hash {
        result = result.item("order_hash", AttributeValue::S(order_hash.clone()));
    }

    if let Some(price) = &token_event.price {
        result = result.item("price", AttributeValue::S(price.clone()));
    }

    if let Some(marketplace_value) = token_event.marketplace {
        result = result.item("marketplace", AttributeValue::S(marketplace_value));
    }

    if let Some(total_fee) = token_event.total_fee {
        result = result.item("total_fee", AttributeValue::S(total_fee));
    }

    if let Some(currency_contract) = token_event.currency_contract {
        result = result.item("currency_contract", AttributeValue::S(currency_contract));
    }

    if let Some(currency_symbol) = token_event.currency_symbol {
        result = result.item("currency_symbol", AttributeValue::S(currency_symbol));
    }

    if let Some(amount) = token_event.amount {
        result = result.item("amount", AttributeValue::S(amount));
    }

    result.send().await?;

    Ok(())
}
