use anyhow::Result;
use clap::Parser;
use tokio::time::{self, Duration};
use ark_starknet::client2::StarknetClient;
use starknet::core::types::{BlockId, BlockTag, EmittedEvent, FieldElement};
use starknet::macros::selector;
use log::{debug, info};
use dotenv::dotenv;
use ark_db::token_event::create::{create_token_event, TokenEvent};
use aws_sdk_dynamodb::Client as DynamoClient;
use aws_config::meta::region::RegionProviderChain;
use ark_starknet::utils::{FormattedTokenId, TokenId};

#[derive(Parser, Debug)]
#[clap(about = "Arkchain indexer")]
struct Args {
    #[clap(long, help = "From block to start indexing")]
    from_block: String,

    #[clap(long, help = "Block where indexing will stop")]
    to_block: Option<String>,

    #[clap(long, help = "RPC url of the chain")]
    rpc: String,

    #[clap(long, help = "Address of the contract to index")]
    contract: String,

    #[clap(long, help = "Fetch interval")]
    fetch_interval: Option<u64>,
}

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();

    let db_client = init_aws_dynamo_client().await;

    let args = Args::parse();
    let sn_client = StarknetClient::new(&args.rpc)?;

    let fetch_interval = match args.fetch_interval {
        Some(f) => f,
        None => 5,
    };

    let from_block = sn_client.parse_block_id(&args.from_block)?;
    let to_block = if let Some(to) = &args.to_block {
        sn_client.parse_block_id(to)?
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

        let blocks_events = sn_client.fetch_events(
            from_block,
            to_block,
            Some(vec![event_keys.to_vec()]),
        )
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

                // Timestamp is always the first element of data.
                let timestamp = ev.data[0];

                if e_selector == ev_broker_registered {
                    debug!("BrokerRegistered");
                } else if e_selector == ev_order_listing_added {
                    debug!("Order listing");
                    let token_event = get_order_listing_data(
                        block_number,
                        &ev.keys,
                        &ev.data,
                    );
                    if token_event.is_some() {
                        create_token_event(
                            &db_client,
                            token_event.unwrap()).await?;
                    }
                } else if e_selector == ev_order_buy_executing {
                    debug!("Order executing");
                } else if e_selector == ev_order_buy_finalized {
                    debug!("Order finalized");

                    let token_event = get_order_finalized_data(
                        block_number,
                        &ev.keys,
                        &ev.data,
                    );
                    if token_event.is_some() {
                        create_token_event(
                            &db_client,
                            token_event.unwrap()).await?;
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
            },
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
        timestamp: timestamp.try_into().unwrap(),
        block_number,
        event_type: String::from("listing"),
        from_address: felt_to_hex_str(&seller),
        padded_token_id: token_id.padded_token_id.clone(),
        token_uri: String::from(""),
        to_address: String::from(""),
        transaction_hash: String::from(""),
        // TODO: need this info from somewhere.
        token_type: String::from("erc721"),
        order_hash,
        price: Some(price.padded_token_id),
        ..Default::default()
    })
}

fn get_order_finalized_data(
    block_number: u64,
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
        timestamp: timestamp.try_into().unwrap(),
        block_number,
        event_type: String::from("listing"),
        from_address: felt_to_hex_str(&seller),
        padded_token_id: token_id.padded_token_id.clone(),
        token_uri: String::from(""),
        to_address: felt_to_hex_str(&buyer),
        transaction_hash: String::from(""),
        // TODO: need this info from somewhere.
        token_type: String::from("erc721"),
        order_hash,
        price: Some(price.padded_token_id),
        ..Default::default()
    })
}
