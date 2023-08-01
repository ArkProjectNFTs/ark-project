use aws_sdk_dynamodb::types::AttributeValue;
use aws_sdk_dynamodb::Error;
use dotenv::dotenv;
use log::info;
use serde::{Deserialize, Serialize};
<<<<<<< HEAD
use serde_json;
use std::collections::HashMap;
=======
// use serde_json;
>>>>>>> 80f1c1a (feat(transferts): remove king)
use std::env;

#[derive(Serialize, Deserialize, Debug)]
enum TransferType {
    In,
    Out,
}

#[derive(Serialize, Deserialize, Debug)]
struct Transfer {
    from: String,
    to: String,
    kind: TransferType,
    timestamp: String,
    transaction_hash: String,
}

pub async fn update_token_transfers(
    dynamo_client: &aws_sdk_dynamodb::Client,
    contract_address: &str,
    padded_token_id: String,
    from_address: &str,
    to_address: &str,
    timestamp: &u64,
    transaction_hash: &str,
) -> Result<Option<String>, Error> {
    dotenv().ok();
    let table = env::var("ARK_TOKENS_TABLE_NAME").expect("ARK_TOKENS_TABLE_NAME must be set");
    let contract_address_av = AttributeValue::S(contract_address.to_string());
    let token_id_av = AttributeValue::S(padded_token_id);

    let request = dynamo_client
        .get_item()
        .table_name(&table)
        .key("address", contract_address_av.clone())
        .key("token_id", token_id_av.clone());

    let result = request.send().await?;

    let current_transfer = Transfer {
        from: from_address.to_string(),
        to: to_address.to_string(),
        kind: TransferType::Out,
        timestamp: timestamp.to_string(),
        transaction_hash: transaction_hash.to_string(),
    };

    let current_transfer_av = convert_transfer_to_map(&current_transfer);

    info!("current_transfer: {:?}", current_transfer);

    match &result.item {
        // If the item exists, we need to update it
        Some(item) => {
            log::info!("item: {:?}", item);
            if let Some(transfers_av) = item.get("transfers") {
                let mut transfers = transfers_av.as_l().unwrap().clone();
                transfers.push(current_transfer_av.clone());
                let transfers_av = AttributeValue::L(transfers);
                let request = dynamo_client
                    .put_item()
                    .table_name(&table)
                    .item("address", contract_address_av.clone())
                    .item("token_id", token_id_av.clone())
                    .item("transfers", transfers_av)
                    .item("token_owner", AttributeValue::S(to_address.to_string()));
                request.send().await?;
            }
        }
        // If the item doesn't exist, we need to create it
        None => {
            let transfers_av = AttributeValue::L(vec![current_transfer_av]);
            let request = dynamo_client
                .put_item()
                .table_name(&table)
                .item("address", contract_address_av.clone())
                .item("token_id", token_id_av.clone())
                .item("transfers", transfers_av)
                .item("token_owner", AttributeValue::S(to_address.to_string()));
            request.send().await?;
        }
    }

    Ok(None)
}

// Function to convert a Transfer into a Map<AttributeValue>
fn convert_transfer_to_map(transfer: &Transfer) -> AttributeValue {
    let mut map: HashMap<String, AttributeValue> = HashMap::new();
    map.insert("from".into(), AttributeValue::S(transfer.from.clone()));
    map.insert("to".into(), AttributeValue::S(transfer.to.clone()));
    map.insert(
        "timestamp".into(),
        AttributeValue::S(transfer.timestamp.clone()),
    );
    map.insert(
        "transaction_hash".into(),
        AttributeValue::S(transfer.transaction_hash.clone()),
    );

    AttributeValue::M(map)
}
