import type { BigNumberish, Uint256 } from "starknet";

export type OrderV1 = {
  route: RouteType;
  offerer: BigNumberish;
  brokerId: BigNumberish;
  currencyAddress: BigNumberish;
  currencyChainId: BigNumberish;
  tokenChainId: BigNumberish;
  tokenAddress: BigNumberish;
  tokenId?: Uint256;
  quantity: Uint256;
  startAmount: Uint256;
  endAmount: Uint256;
  salt: BigNumberish;
  startDate: number;
  endDate: number;
  additionalData: BigNumberish[];
};

export type ExecutionInfo = {
  orderHash: BigNumberish;
  fulfiller: BigNumberish;
  offerHash?: BigNumberish;
  tokenChainId: BigNumberish;
  tokenAddress: BigNumberish;
  tokenId?: Uint256;
};

export enum RouteType {
  Erc20ToErc721 = 0,
  Erc721ToErc20 = 1,
}
