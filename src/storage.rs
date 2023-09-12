//! Storage initializers.

use ark_storage::storage_manager::DefaultStorage;

/// New Default storage manager.
pub fn init_default() -> DefaultStorage {
    log::info!("Storage backend: default");
    DefaultStorage::new()
}

///
pub fn init_aws() {
    // TODO: add AWS initialization and return AwsStorage.

    // let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
    // let config = aws_config::from_env().region(region_provider).load().await;
    // let dynamo_client = DynamoClient::new(&config);
    // let reqwest_client = ReqwestClient::new();
    // let ecs_task_id = get_ecs_task_id();
    // let is_continous = env::var("END_BLOCK").is_err();

    // info!(
    //     "\n=== Indexing started ===\n\necs_task_id: {}\nis_continous: {}",
    //     ecs_task_id, is_continous
    // );
}
