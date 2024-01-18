import { Account, cairo, CallData, ProviderInterface } from "starknet";

import { STARKNET_ETH_ADDRESS } from "../constants";

export const mintERC20 = async (
  starknetProvider: ProviderInterface,
  starknetFulfillerAccount: Account
) => {
  console.log("STARKNET_ETH_ADDRESS" + STARKNET_ETH_ADDRESS);
  const mintErc20Result = await starknetFulfillerAccount.execute({
    contractAddress: STARKNET_ETH_ADDRESS,
    entrypoint: "mint",
    calldata: CallData.compile({
      recipient: starknetFulfillerAccount.address,
      amount: cairo.uint256(1000000000000000000)
    })
  });

  await starknetProvider.waitForTransaction(mintErc20Result.transaction_hash);
};
