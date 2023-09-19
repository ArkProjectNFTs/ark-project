use anyhow::Result;
use ark_metadata::metadata_manager::MetadataManager;
use ark_starknet::client::{StarknetClient, StarknetClientHttp};
use ark_storage::DefaultStorage;
use starknet::core::types::FieldElement;

#[tokio::main]
async fn main() -> Result<()> {

    let storage = DefaultStorage::new();

    let starknet_client =
        StarknetClientHttp::new("https://starknode.thearkproject.dev/mainnet").unwrap();
    let mut metadata_manager = MetadataManager::new(&storage, &starknet_client);

    let contract_address = FieldElement::from_hex_be(
        &"0x0727a63f78ee3f1bd18f78009067411ab369c31dece1ae22e16f567906409905",
    )
    .unwrap();
    let token_id_low = FieldElement::from_dec_str("1").unwrap();
    let token_id_high = FieldElement::from_dec_str("0").unwrap();
    let force_refresh = Some(true);
    let cache_image = Some(false);

    // contract_address: FieldElement,
    // token_id_low: FieldElement,
    // token_id_high: FieldElement,
    // force_refresh: Option<bool>,
    // cache_image: Option<bool>,

    match metadata_manager
        .refresh_metadata_for_token(
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
