use anyhow::Result;
use ark_metadata::{file_manager::LocalFileManager, metadata_manager::MetadataManager};
use ark_starknet::client::{StarknetClient, StarknetClientHttp};
use ark_storage::DefaultStorage;
use dotenv::dotenv;
use starknet::core::types::FieldElement;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();

    let storage = DefaultStorage::new();
    let file_manager = LocalFileManager::default();

    let starknet_client =
        StarknetClientHttp::new("https://starknode.thearkproject.dev/mainnet").unwrap();
    let mut metadata_manager = MetadataManager::new(&storage, &starknet_client, &file_manager);

    let contract_address = FieldElement::from_hex_be(
        &"0x0727a63f78ee3f1bd18f78009067411ab369c31dece1ae22e16f567906409905",
    )
    .unwrap();
    let token_id_low = FieldElement::from_dec_str("1").unwrap();
    let token_id_high = FieldElement::from_dec_str("0").unwrap();
    let force_refresh = Some(true);
    let cache_image = Some(true);

    match metadata_manager
        .refresh_token_metadata(
            contract_address,
            token_id_low,
            token_id_high,
            force_refresh,
            cache_image,
        )
        .await
    {
        Ok(_) => println!("Success!"),
        Err(e) => println!("Error: {:?}", e),
    }

    Ok(())
}
