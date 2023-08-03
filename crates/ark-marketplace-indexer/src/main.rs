use ark_db::collection_activity::create::{create_collection_activity, CollectionActivity};
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::Client as DynamoClient;
use starknet::{
    core::{
        types::{BlockId, EmittedEvent, EventFilter, FieldElement},
        utils::get_selector_from_name,
    },
    providers::{jsonrpc::HttpTransport, JsonRpcClient, Provider},
};
use std::error::Error;
use url::Url;

#[tokio::main]
async fn main() {
    let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
    let config = aws_config::from_env().region(region_provider).load().await;
    let dynamo_client = DynamoClient::new(&config);

    let rpc_client = JsonRpcClient::new(HttpTransport::new(
        Url::parse("https://starknode.thearkproject.dev/mainnet").unwrap(),
    ));

    // // Unframed contract

    let unframed_start_block = BlockId::Number(105658);
    let unframed_contract_address = FieldElement::from_hex_be(
        "0x051734077ba7baf5765896c56ce10b389d80cdcee8622e23c0556fb49e82df1b",
    )
    .unwrap();
    let events = fetch_unframed_events(
        rpc_client,
        dynamo_client,
        unframed_start_block,
        None,
        unframed_contract_address,
    )
    .await;

    println!("events: {:?}", events);
}

pub async fn fetch_unframed_events(
    rpc_client: JsonRpcClient<HttpTransport>,
    dynamo_client: DynamoClient,
    from_block: BlockId,
    to_block: Option<BlockId>,
    address: FieldElement,
) -> Result<(), Box<dyn Error>> {
    let mut keys: Vec<Vec<FieldElement>> = Vec::new();

    let executed_order_selector = get_selector_from_name("OrderExecuted")?;
    keys.push(vec![executed_order_selector]);

    let filter = EventFilter {
        from_block: Some(from_block),
        to_block: to_block,
        address: Some(address),
        keys: Some(keys),
    };

    // let mut events = vec![];

    let chunk_size = 100;
    let mut continuation_token: Option<String> = None;

    loop {
        let event_page = rpc_client
            .get_events(filter.clone(), continuation_token, chunk_size)
            .await?;

        // Iterate over event_page.events

        for event in event_page.events {
            if event.keys.contains(&executed_order_selector) {
                println!("Sale detected: {:?}", event);

                let collection_activity = CollectionActivity {
                    address: "".to_string(),
                };

                // create_collection_activity(&dynamo_client, collection_activity).await;
            }
        }

        // === Exemple of event_page.events ===

        // {
        //     "from_address": "0x051734077ba7baf5765896c56ce10b389d80cdcee8622e23c0556fb49e82df1b",
        //     "keys": [
        //       "0x01390fd803c110ac71730ece1decfc34eb1d0088e295d4f1b125dda1e0c5b9ff"
        //     ],
        //     "data": [
        //       "0x0000000000000000000000000000000000000000000000000000000000000000",
        //       "0x042f834bc0c91f746aceaa44bf399efff1a4c6586d9b586b0b739b1da0493c5d"
        //     ],
        //     "block_hash": "0x025afec64c65f649600bedc39e19f482b26966b26d6a90d5c01edb16dadd0d2e",
        //     "block_number": "105658",
        //     "transaction_hash": "0x06ce4aada75d81794a2b7e02f8f63675605e63e8435d2ef73c8f1804baecf241"
        //   }

        continuation_token = event_page.continuation_token;

        println!("Continuation token: {:?}", continuation_token);

        if continuation_token.is_none() {
            break;
        }
    }

    Ok(())
}
