import type { BigNumberish, CairoOption, Uint256 } from "starknet";

export type OrderV1 = {
  route: RouteType;
  offerer: BigNumberish;
  brokerId: BigNumberish;
  currencyAddress: BigNumberish;
  currencyChainId: BigNumberish;
  tokenChainId: BigNumberish;
  tokenAddress: BigNumberish;
  tokenId: CairoOption<Uint256>;
  quantity: Uint256;
  startAmount: Uint256;
  endAmount: Uint256;
  salt: BigNumberish;
  startDate: number;
  endDate: number;
  additionalData: BigNumberish[];
};

export type BaseOrderV1 = {
  route: RouteType;
  offerer: BigNumberish;
  brokerId: BigNumberish;
  tokenAddress: BigNumberish;
  tokenId: BigNumberish;
  startAmount: BigNumberish;
  endAmount?: BigNumberish;
  startDate?: number;
  endDate?: number;
};

export enum RouteType {
  Erc20ToErc721 = 0,
  Erc721ToErc20 = 1
}

export type CancelInfo = {
  order_hash: BigNumberish;
  token_address: BigNumberish;
  token_id: BigNumberish;
};

export type FullCancelInfo = {
  order_hash: BigNumberish;
  canceller: BigNumberish;
  token_chain_id: BigNumberish;
  token_address: BigNumberish;
  token_id: CairoOption<Uint256>;
};
