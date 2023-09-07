use anyhow::Result;
use ark_db::token::update::update_token_listing;
use ark_db::token_event::create::{create_token_event, TokenEvent};
use ark_starknet::client2::StarknetClient;
use ark_starknet::utils::TokenId;
use aws_config::meta::region::RegionProviderChain;
use aws_sdk_dynamodb::Client as DynamoClient;
use dotenv::dotenv;
use log::debug;
use starknet::core::types::{BlockId, BlockTag, FieldElement};
use starknet::macros::selector;
use tokio::time::{self, Duration};

// #[derive(Parser, Debug)]
// #[clap(about = "Arkchain indexer")]
// struct Args {
//     #[clap(long, help = "From block to start indexing")]
//     from_block: String,

//     #[clap(long, help = "Block where indexing will stop")]
//     to_block: Option<String>,

//     #[clap(long, help = "RPC url of the chain")]
//     rpc: String,

//     #[clap(long, help = "Address of the contract to index")]
//     contract: String,

//     #[clap(long, help = "Fetch interval")]
//     fetch_interval: Option<u64>,
// }

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();
    env_logger::init();

    let db_client = init_aws_dynamo_client().await;

    // let args = Args::parse();

    let rpc = std::env::var("RPC_PROVIDER").expect("RPC_PROVIDER url not provided");
    let sn_client = StarknetClient::new(&rpc)?;

    let fetch_interval: u64 = std::env::var("FETCH_INTERVAL")
        .unwrap_or_else(|_| "5".to_string())
        .parse()
        .expect("Invalid fetch interval");

    let from_block_str = std::env::var("FROM_BLOCK").expect("From block not provided");
    let from_block = sn_client.parse_block_id(&from_block_str)?;

    let to_block_str = std::env::var("TO_BLOCK").unwrap_or_else(|_| "Latest".to_string());
    let to_block = if to_block_str != "Latest" {
        sn_client.parse_block_id(&to_block_str)?
    } else {
        BlockId::Tag(BlockTag::Latest)
    };

    let ev_broker_registered: FieldElement = selector!("BrokerRegistered");
    let ev_order_listing_added: FieldElement = selector!("OrderListingAdded");
    let ev_order_buy_executing: FieldElement = selector!("OrderBuyExecuting");
    let ev_order_buy_finalized: FieldElement = selector!("OrderBuyFinalized");
    let event_keys: &[FieldElement] = &[
        ev_broker_registered,
        ev_order_listing_added,
        ev_order_buy_executing,
        ev_order_buy_finalized,
    ];

    let mut last_fetched_block = 0;
    loop {
        time::sleep(Duration::from_secs(fetch_interval)).await;

        let last_chain_block = sn_client.block_number().await?;

        if last_fetched_block >= last_chain_block {
            debug!("Nothing to fetch");
            continue;
        }

        let blocks_events = sn_client
            .fetch_events(from_block, to_block, Some(vec![event_keys.to_vec()]))
            .await?;

        for (block_number, events) in blocks_events {
            debug!("Block # {:?}", block_number);
            if block_number > last_fetched_block {
                last_fetched_block = block_number;
            }

            for ev in events {
                if ev.data.len() < 1 {
                    // Skip events with no data as all events has
                    // data for now.
                    continue;
                }

                // Safe [0] as any events has at least 1 key: the selector.
                let e_selector = ev.keys[0];

                let tx_hash_str = felt_to_hex_str(&ev.transaction_hash);

                if e_selector == ev_broker_registered {
                    debug!("BrokerRegistered");
                } else if e_selector == ev_order_listing_added {
                    debug!("Order listing");
                    let token_event = get_order_listing_data(
                        block_number,
                        tx_hash_str.clone(),
                        &ev.keys,
                        &ev.data,
                    );

                    if let Some(te) = token_event {
                        // TODO: we need to check if the token
                        // is not already pending/finalized?

                        create_token_event(&db_client, te.clone()).await?;

                        update_token_listing(
                            &db_client,
                            te.address,
                            te.padded_token_id,
                            String::from("listed"),
                            te.price.unwrap_or(String::from("0")),
                            te.order_hash.unwrap_or(String::from("")),
                        )
                        .await?;
                    }
                } else if e_selector == ev_order_buy_executing {
                    debug!("Order executing");
                    // Same data as finalized, but we don't send
                    // the token event. We only gather the data.
                    let token_event = get_order_finalized_data(
                        block_number,
                        tx_hash_str.clone(),
                        &ev.keys,
                        &ev.data,
                    );

                    if let Some(te) = token_event {
                        update_token_listing(
                            &db_client,
                            te.address,
                            te.padded_token_id,
                            String::from("pending"),
                            te.price.unwrap_or(String::from("0")),
                            te.order_hash.unwrap_or(String::from("")),
                        )
                        .await?;
                    }
                } else if e_selector == ev_order_buy_finalized {
                    debug!("Order finalized");

                    let token_event = get_order_finalized_data(
                        block_number,
                        tx_hash_str.clone(),
                        &ev.keys,
                        &ev.data,
                    );
                    if let Some(te) = token_event {
                        create_token_event(&db_client, te.clone()).await?;

                        update_token_listing(
                            &db_client,
                            te.address,
                            te.padded_token_id,
                            String::from(""),
                            te.price.unwrap_or(String::from("")),
                            te.order_hash.unwrap_or(String::from("")),
                        )
                        .await?;
                    }
                } else {
                    debug!("Event ignored");
                }

                debug!("Event: {:?}\n", ev);
            }
        }

        match to_block {
            BlockId::Number(n) => {
                if last_fetched_block >= n {
                    break;
                }
            }
            _ => continue,
        }
    }

    Ok(())
}

async fn init_aws_dynamo_client() -> DynamoClient {
    dotenv().ok();
    let region_provider = RegionProviderChain::default_provider().or_else("us-east-1");
    let config = aws_config::from_env().region(region_provider).load().await;
    DynamoClient::new(&config)
}

fn felt_to_hex_str(f: &FieldElement) -> String {
    format!("{:#064x}", f)
}

fn get_order_listing_data(
    block_number: u64,
    transaction_hash: String,
    keys: &[FieldElement],
    data: &[FieldElement],
) -> Option<TokenEvent> {
    if data.len() != 7 || keys.len() < 2 {
        return None;
    }
    let order_hash = Some(felt_to_hex_str(&keys[1]));

    let timestamp = data[0];
    let seller = data[1];
    let collection = data[2];

    let token_id = TokenId {
        low: data[3],
        high: data[4],
    };

    // TODO: replace this by a u256 utils better than tokenid utils.
    let price = TokenId {
        low: data[5],
        high: data[6],
    };

    let token_id = token_id.format();
    let price = price.format();

    Some(TokenEvent {
        address: felt_to_hex_str(&collection),
        timestamp: timestamp.try_into().unwrap_or(0),
        block_number,
        event_type: String::from("listing"),
        from_address: felt_to_hex_str(&seller),
        padded_token_id: token_id.padded_token_id.clone(),
        token_uri: String::from(""),
        to_address: String::from(""),
        transaction_hash,
        // TODO: need this info from somewhere.
        token_type: String::from("erc721"),
        order_hash,
        price: Some(price.padded_token_id),
        ..Default::default()
    })
}

fn get_order_finalized_data(
    block_number: u64,
    transaction_hash: String,
    keys: &[FieldElement],
    data: &[FieldElement],
) -> Option<TokenEvent> {
    if data.len() != 8 || keys.len() < 2 {
        return None;
    }

    let order_hash = Some(felt_to_hex_str(&keys[1]));

    let timestamp = data[0];
    let seller = data[1];
    let buyer = data[2];
    let collection = data[3];

    let token_id = TokenId {
        low: data[4],
        high: data[5],
    };

    // TODO: replace this by a u256 utils better than tokenid utils.
    let price = TokenId {
        low: data[6],
        high: data[7],
    };

    let token_id = token_id.format();
    let price = price.format();

    Some(TokenEvent {
        address: felt_to_hex_str(&collection),
        timestamp: timestamp.try_into().unwrap_or(0),
        block_number,
        event_type: String::from("sale"),
        from_address: felt_to_hex_str(&seller),
        padded_token_id: token_id.padded_token_id.clone(),
        token_uri: String::from(""),
        to_address: felt_to_hex_str(&buyer),
        transaction_hash,
        // TODO: need this info from somewhere.
        token_type: String::from("erc721"),
        order_hash,
        price: Some(price.padded_token_id),
        ..Default::default()
    })
}
