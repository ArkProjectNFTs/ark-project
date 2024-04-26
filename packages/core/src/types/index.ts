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

export type ListingV1 = {
  brokerId: BigNumberish;
  tokenAddress: BigNumberish;
  tokenId: BigNumberish;
  currencyAddress?: BigNumberish;
  currencyChainId?: BigNumberish;
  startAmount: BigNumberish;
  startDate?: number;
  endDate?: number;
};

export type OfferV1 = {
  brokerId: BigNumberish;
  tokenAddress: BigNumberish;
  tokenId: BigNumberish;
  currencyAddress?: BigNumberish;
  currencyChainId?: BigNumberish;
  startAmount: BigNumberish;
  startDate?: number;
  endDate?: number;
};

export enum RouteType {
  Erc20ToErc721 = 0,
  Erc721ToErc20 = 1
}

export type CancelInfo = {
  orderHash: BigNumberish;
  tokenAddress: BigNumberish;
  tokenId: BigNumberish;
};

export type FullCancelInfo = {
  orderHash: BigNumberish;
  canceller: BigNumberish;
  tokenChainId: BigNumberish;
  tokenAddress: BigNumberish;
  tokenId: CairoOption<Uint256>;
};

export type FulfillInfo = {
  order_hash: BigNumberish;
  related_order_hash: CairoOption<BigNumberish>;
  fulfiller: BigNumberish;
  token_chain_id: BigNumberish;
  token_address: BigNumberish;
  token_id: CairoOption<Uint256>;
};

export type BaseFulfillInfo = {
  orderHash: BigNumberish;
  tokenAddress: BigNumberish;
  tokenId: BigNumberish;
  brokerId: BigNumberish;
};

export type ApproveErc20Info = {
  currencyAddress: BigNumberish;
  amount: BigNumberish;
};

export type ApproveErc721Info = {
  tokenAddress: BigNumberish;
  tokenId: BigNumberish;
};

export type FulfillListingInfo = BaseFulfillInfo;
export type FulfillOfferInfo = BaseFulfillInfo;
