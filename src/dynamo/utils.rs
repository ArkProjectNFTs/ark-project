pub fn check_address_exists(
    client: &DynamoClient,
    table_name: &str,
    address: &str,
) -> Result<bool, Box<dyn Error>> {
    list_tables(&dynamo_client).await.unwrap();
    // TODO check why it's not working or maybe remove cause we need fresh events
    if check_address_exists(&dynamo_client, "ark_nft_collections", &from_address)
        .await
        .unwrap()
    {
        // If the item exists, skip the current iteration.
        continue;
    }
}
