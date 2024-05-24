import type { BigNumberish, CairoOption, constants, Uint256 } from "starknet";

export enum RouteType {
  Erc20ToErc721 = 0,
  Erc721ToErc20 = 1
}

export type OrderV1 = {
  route: RouteType;
  offerer: string;
  brokerId: string;
  currencyAddress: string;
  currencyChainId: constants.StarknetChainId;
  tokenChainId: constants.StarknetChainId;
  tokenAddress: string;
  tokenId: CairoOption<Uint256>;
  quantity: Uint256;
  startAmount: Uint256;
  endAmount: Uint256;
  salt: number;
  startDate: number;
  endDate: number;
  additionalData: BigNumberish[];
};

export type OfferV1 = {
  brokerId: string;
  tokenAddress: string;
  tokenId: bigint;
  currencyAddress?: string;
  currencyChainId?: constants.StarknetChainId;
  startAmount: bigint;
  startDate?: number;
  endDate?: number;
};

export type ListingV1 = {
  brokerId: string;
  tokenAddress: string;
  tokenId: bigint;
  currencyAddress?: string;
  currencyChainId?: constants.StarknetChainId;
  startAmount: bigint;
  startDate?: number;
  endDate?: number;
};

export type AuctionV1 = {
  brokerId: string;
  tokenAddress: string;
  tokenId: bigint;
  currencyAddress?: string;
  currencyChainId?: constants.StarknetChainId;
  startAmount: bigint;
  endAmount: bigint;
  startDate?: number;
  endDate?: number;
};

export type CancelInfo = {
  orderHash: bigint;
  tokenAddress: string;
  tokenId: bigint;
};

export type FullCancelInfo = {
  orderHash: bigint;
  canceller: string;
  tokenChainId: constants.StarknetChainId;
  tokenAddress: string;
  tokenId: CairoOption<Uint256>;
};

export type FulfillInfo = {
  orderHash: bigint;
  relatedOrderHash: CairoOption<BigNumberish>;
  fulfiller: string;
  tokenChainId: constants.StarknetChainId;
  tokenAddress: string;
  tokenId: CairoOption<Uint256>;
  fulfillBrokerAddress: string;
};

export type BaseFulfillInfo = {
  orderHash: bigint;
  tokenAddress: string;
  tokenId: bigint;
  brokerId: string;
};

export type FulfillOfferInfo = BaseFulfillInfo;

export type FulfillListingInfo = BaseFulfillInfo;

export type FulfillAuctionInfo = BaseFulfillInfo & {
  relatedOrderHash: bigint;
};

export type ApproveErc20Info = {
  currencyAddress: string;
  amount: bigint;
};

export type ApproveErc721Info = {
  tokenAddress: string;
  tokenId: bigint;
};
