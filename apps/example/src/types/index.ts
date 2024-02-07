export type TokenMarketData = {
  token_chain_id: string;
  token_address: string;
  token_id: string;
  listed_timestamp: number;
  updated_timestamp: number;
  current_owner: string;
  current_price: number | null;
  quantity: string;
  order_hash: string;
  start_amount: string;
  end_amount: string;
  start_date: number;
  end_date: number;
  broker_id: string;
  is_listed: boolean;
  has_offer: boolean;
  top_bid: {
    amount: string;
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
