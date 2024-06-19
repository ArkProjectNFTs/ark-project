export type TokenMarketData = {
  token_chain_id: string;
  token_address: string;
  token_id: string;
  listed_timestamp: number;
  updated_timestamp: number;
  current_owner: string;
  last_price: bigint | null;
  quantity: string;
  order_hash: string;
  start_amount: bigint;
  end_amount: bigint;
  start_date: number;
  end_date: number;
  broker_id: string;
  is_listed: boolean;
  has_offer: boolean;
  status: string;
  top_bid: {
    amount: bigint;
    order_hash: string;
  };
};

export type ContractInfo = {
  contract_address: string;
  contract_type: string;
  image: string;
  name: string;
  symbol: string;
};
