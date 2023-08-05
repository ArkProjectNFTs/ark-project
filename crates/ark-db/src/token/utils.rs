use aws_sdk_dynamodb::types::AttributeValue;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub enum TransferType {
    In,
    Out,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Transfer {
    pub from: String,
    pub to: String,
    pub kind: TransferType,
    pub timestamp: String,
    pub transaction_hash: String,
}

// Function to convert a Transfer into a Map<AttributeValue>
pub fn convert_transfer_to_map(transfer: &Transfer) -> AttributeValue {
    let mut map: HashMap<String, AttributeValue> = HashMap::new();
    map.insert("from".into(), AttributeValue::S(transfer.from.clone()));
    map.insert("to".into(), AttributeValue::S(transfer.to.clone()));
    map.insert(
        "event_timestamp".into(),
        AttributeValue::S(transfer.timestamp.clone()),
    );
    map.insert(
        "transaction_hash".into(),
        AttributeValue::S(transfer.transaction_hash.clone()),
    );

    AttributeValue::M(map)
}
