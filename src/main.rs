mod storage;

use anyhow::Result;
use ark_core;

#[tokio::main]
async fn main() -> Result<()> {
    // Init AWS.

    // Init desired storage.
    let storage = storage::init_default();

    // TODO: add a monitor manager impl here, to be passed to the main loop.

    // Start the loop.
    ark_core::indexer_main_loop(storage).await?;

    Ok(())
}
