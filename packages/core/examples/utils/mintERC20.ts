import {
  Account,
  BigNumberish,
  cairo,
  Call,
  CallData,
  ProviderInterface
} from "starknet";

import { STARKNET_ETH_ADDRESS } from "../constants";

export const mintERC20 = async (
  starknetProvider: ProviderInterface,
  starknetAccount: Account,
  amount: BigNumberish
) => {
  const { abi: erc20abi } =
    await starknetProvider.getClassAt(STARKNET_ETH_ADDRESS);
  if (erc20abi === undefined) {
    throw new Error("no abi.");
  }

  const mintERC20Call: Call = {
    contractAddress: STARKNET_ETH_ADDRESS,
    entrypoint: "mint",
    calldata: CallData.compile([starknetAccount.address, cairo.uint256(amount)])
  };

  await starknetAccount.execute(mintERC20Call, [erc20abi], {
    maxFee: 0
  });
};
