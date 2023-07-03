enum TransferType {
  In,
  Out,
}

struct transfer {
  from: String,
  to: String,
  kind: TransferType,
}

// Structure for ark token owner
struct ark_token_owner {
  address: String,
  transfers: Vec<transfer>,
  owned_tokens: Vec<ark_token>,
}

// Structure for ark token
struct ark_token {
  token_id: String,
  contract_address: String,
  token_uri: String,
}

// Structure for ark token database
struct ark_tokens {
  tokens: Vec<ark_token>,
}

// Structure for ark token owner
struct ark_token_owner {
  address: String,
  transfers: Vec<transfer>,
  owned_tokens: Vec<ark_token>,
}

// structure for ark collection
struct ark_collection {
  contract_address: String,
  name: String,
  symbol: String,
  deployer_address: String,
  deployed_block_number: String,
  supply: u64,
}