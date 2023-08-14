use aws_sdk_dynamodb::Client;
use log::{error, info};

pub async fn delete_table(client: Client, table: String) {
    let resp = client.delete_table().table_name(&table).send().await;

    match resp {
        Ok(_) => {
            info!("Successfully deleted table: {}", table);
        }
        Err(e) => {
            error!("Failed to delete table {}: {:?}", table, e);
        }
    }
}
