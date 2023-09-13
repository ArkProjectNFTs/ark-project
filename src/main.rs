mod managers;
mod storage;

use anyhow::Result;


use managers::collection_manager::ContractType;






use ark_core;

#[tokio::main]
async fn main() -> Result<()> {
    ark_core::indexer_main_loop().await?;

    Ok(())
}
