mod arkindexer;
mod constants;
mod dynamo;
mod starknet;
mod utils;
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::Client as DynamoClient;

use arkindexer::block_processor::get_blocks;
use reqwest::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
    let config = aws_config::from_env().region(region_provider).load().await;

    let dynamo_client = DynamoClient::new(&config);
    let reqwest_client = Client::new();

    let result = get_blocks(&reqwest_client, &dynamo_client).await;
    
    result
}
