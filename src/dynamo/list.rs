use aws_sdk_dynamodb::{Client, Error};

#[allow(dead_code)]
pub async fn list_tables(client: &Client) -> Result<Vec<String>, Error> {
    let req = client.list_tables().limit(10);
    let resp = req.send().await?;
    println!("Current DynamoDB tables: {:?}", resp.table_names);
    Ok(resp.table_names.unwrap_or_default())
}
