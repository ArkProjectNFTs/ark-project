#[derive(Debug, Clone)]
pub struct PlacedData {
    pub order_hash: String,
    pub order_version: String,
    pub order_type: String,
    pub cancelled_order_hash: Option<String>,
    // Order V1.
    pub route: String,
    pub currency_address: String,
    pub currency_chain_id: String,
    pub salt: String,
    pub offerer: String,
    pub token_chain_id: String,
    pub token_address: String,
    pub token_id: Option<String>,
    pub quantity: String,
    pub start_amount: String,
    pub end_amount: String,
    pub start_date: u64,
    pub end_date: u64,
    pub broker_id: String,
}

#[derive(Debug, Clone)]
pub struct CancelledData {
    pub order_hash: String,
    pub order_type: String,
    pub reason: String,
}

#[derive(Debug, Clone)]
pub struct RollbackStatusData {
    pub order_hash: String,
    pub order_type: String,
    pub reason: String,
}

#[derive(Debug, Clone)]
pub struct FulfilledData {
    pub order_hash: String,
    pub order_type: String,
    pub fulfiller: String,
    pub related_order_hash: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ExecutedData {
    pub version: u8,
    pub order_hash: String,
    pub order_type: Option<String>,
    pub transaction_hash: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
}
