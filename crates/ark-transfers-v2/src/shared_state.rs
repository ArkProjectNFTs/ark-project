use std::sync::{Arc, Mutex};
use std::fmt;

pub struct EventData {
    pub timestamp: u64,
    pub from_address: String,
    pub to_address: String,
    pub contract_address: String,
    pub transaction_hash: String,
    pub token_id_low: u64,
    pub token_id_high: u64,
    pub block_number: u64,
}

impl EventData {
    /// Constructs a new `EventData` with default values.
    pub fn new() -> Self {
        EventData {
            timestamp: 0,
            from_address: String::new(),
            to_address: String::new(),
            contract_address: String::new(),
            transaction_hash: String::new(),
            token_id_low: 0,
            token_id_high: 0,
            block_number: 0,
        }
    }
}

impl fmt::Display for EventData {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "EventData [\n\tFrom: {},\n\tTo: {},\n\tContract Address: {},\n\tTransaction Hash: {},\n\tToken ID Low: {},\n\tToken ID High: {},\n\tBlock Number: {}\n]", 
            self.from_address, self.to_address, self.contract_address, self.transaction_hash, self.token_id_low, self.token_id_high, self.block_number)
    }
}

impl fmt::Debug for EventData {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        f.debug_struct("EventData")
            .field("From", &self.from_address)
            .field("To", &self.to_address)
            .field("Contract Address", &self.contract_address)
            .field("Transaction Hash", &self.transaction_hash)
            .field("Token ID Low", &self.token_id_low)
            .field("Token ID High", &self.token_id_high)
            .field("Block Number", &self.block_number)
            .finish()
    }
}

pub struct SharedState {
    data: Arc<Mutex<EventData>>,
}

impl SharedState {
    pub fn new(data: EventData) -> Self {
        SharedState {
            data: Arc::new(Mutex::new(data)),
        }
    }

    pub fn access(&self) -> Arc<Mutex<EventData>> {
        self.data.clone()
    }
}
