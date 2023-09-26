pub mod storage;

use std::sync::Arc;

use log::{debug, trace};
use starknet::core::types::{BlockId, FieldElement};
use starknet::macros::selector;

use ark_starknet::{
    client::{StarknetClient, StarknetClientHttp},
    format::felt_to_hex_str,
    CairoU256,
};

use storage::*;

// Those events must match the one implemented in the Orderbook (on the arkchain).
const EV_BROKER_REGISTERED: FieldElement = selector!("BrokerRegistered");
const EV_ORDER_LISTING_ADDED: FieldElement = selector!("OrderListingAdded");
const EV_ORDER_BUY_EXECUTING: FieldElement = selector!("OrderBuyExecuting");
const EV_ORDER_BUY_FINALIZED: FieldElement = selector!("OrderExecuted");

const EVENT_SELECTORS: &[FieldElement; 4] = &[
    EV_BROKER_REGISTERED,
    EV_ORDER_LISTING_ADDED,
    EV_ORDER_BUY_EXECUTING,
    EV_ORDER_BUY_FINALIZED,
];

pub type IndexerResult<T> = Result<T, IndexerError>;

#[derive(Debug, thiserror::Error)]
pub enum IndexerError {
    #[error("Event is not formatted as expected")]
    BadEventFormat,
    #[error("Storage error occurred")]
    StorageError(StorageError),
    #[error("Starknet client error")]
    StarknetError(String),
}

impl From<StorageError> for IndexerError {
    fn from(e: StorageError) -> Self {
        IndexerError::StorageError(e)
    }
}

pub struct ArkchainIndexer<S: ArkchainStorage> {
    client: Arc<StarknetClientHttp>,
    storage: Arc<S>,
}

impl<S: ArkchainStorage> ArkchainIndexer<S> {
    ///
    pub fn new(client: Arc<StarknetClientHttp>, storage: Arc<S>) -> Self {
        ArkchainIndexer {
            client: Arc::clone(&client),
            storage: Arc::clone(&storage),
        }
    }

    ///
    pub async fn index_block_range(
        &self,
        from_block: BlockId,
        to_block: BlockId,
    ) -> IndexerResult<()> {
        let blocks_events = self
            .client
            .fetch_events(from_block, to_block, Some(vec![EVENT_SELECTORS.to_vec()]))
            .await
            .map_err(|e| IndexerError::StarknetError(e.to_string()))?;

        for (block_number, events) in blocks_events {
            debug!("Block # {:?}", block_number);

            for ev in events {
                if ev.data.is_empty() || ev.keys.is_empty() {
                    // Skip events with no data / no keys as all events has
                    // them for now.
                    continue;
                }

                let e_selector = ev.keys[0];
                let _tx_hash_str = felt_to_hex_str(&ev.transaction_hash);

                if e_selector == EV_BROKER_REGISTERED {
                    debug!("Broker register event");
                    if let Some(d) = get_broker_data(&ev.keys, &ev.data) {
                        self.storage.register_broker(d).await?;
                    }
                } else if e_selector == EV_ORDER_LISTING_ADDED {
                    debug!("Add order listing event");
                    if let Some(d) = get_order_listing_data(&ev.keys, &ev.data) {
                        self.storage.add_listing_order(d).await?;
                    }
                } else if e_selector == EV_ORDER_BUY_EXECUTING {
                    debug!("Order buy executing");
                    if let Some(d) = get_order_buy_data(&ev.keys, &ev.data) {
                        self.storage.set_order_buy_executing(d).await?;
                    }
                } else if e_selector == EV_ORDER_BUY_FINALIZED {
                    debug!("Order finalized");
                    if let Some(d) = get_order_finalized_data(&ev.keys, &ev.data) {
                        self.storage.set_order_finalized(d).await?;
                    }
                } else {
                    unreachable!();
                }
            }
        }

        Ok(())
    }
}

fn get_broker_data(keys: &[FieldElement], data: &[FieldElement]) -> Option<BrokerData> {
    if keys.len() < 3 || data.len() < 2 {
        trace!(
            "Broker register event bad format:\nkeys{:?}\ndata{:?}",
            keys,
            data
        );
        return None;
    }

    Some(BrokerData {
        name: keys[1],
        chain_id: keys[2],
        timestamp: data[0].try_into().unwrap_or(0),
        public_key: data[1],
    })
}

fn get_order_listing_data(
    keys: &[FieldElement],
    data: &[FieldElement],
) -> Option<OrderListingData> {
    if keys.len() != 4 || data.len() != 7 {
        trace!(
            "Add order listing event bad format:\nkeys{:?}\ndata{:?}",
            keys,
            data
        );
        return None;
    }

    Some(OrderListingData {
        order_hash: keys[1],
        broker_name: keys[2],
        chain_id: keys[3],
        timestamp: data[0].try_into().unwrap_or(0),
        seller: data[1],
        collection: data[2],
        token_id: CairoU256 {
            low: data[3].try_into().expect("u128 overflow"),
            high: data[4].try_into().expect("u128 overflow"),
        },
        price: CairoU256 {
            low: data[5].try_into().expect("u128 overflow"),
            high: data[6].try_into().expect("u128 overflow"),
        },
    })
}

fn get_order_buy_data(
    keys: &[FieldElement],
    data: &[FieldElement],
) -> Option<OrderBuyExecutingData> {
    if keys.len() != 4 || data.len() != 8 {
        trace!(
            "Add order buy executing event bad format:\nkeys{:?}\ndata{:?}",
            keys,
            data
        );
        return None;
    }

    Some(OrderBuyExecutingData {
        order_hash: keys[1],
        broker_name: keys[2],
        chain_id: keys[3],
        timestamp: data[0].try_into().unwrap_or(0),
        buyer: data[2],
    })
}

fn get_order_finalized_data(
    keys: &[FieldElement],
    data: &[FieldElement],
) -> Option<OrderFinalizedData> {
    if keys.len() != 2 || data.len() != 8 {
        trace!(
            "Add order finalized event bad format:\nkeys{:?}\ndata{:?}",
            keys,
            data
        );
        return None;
    }

    Some(OrderFinalizedData {
        order_hash: keys[1],
        timestamp: data[0].try_into().unwrap_or(0),
    })
}
