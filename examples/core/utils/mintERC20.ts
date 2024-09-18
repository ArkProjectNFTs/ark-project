import {
  type Account,
  cairo,
  type Call,
  CallData,
  type ProviderInterface
} from "starknet";

import { config } from "../config/index.js";

export const mintERC20 = async (
  provider: ProviderInterface,
  starknetAccount: Account,
  amount: bigint
) => {
  const { abi: erc20abi } = await provider.getClassAt(
    config.starknetCurrencyContract
  );
  if (erc20abi === undefined) {
    throw new Error("no abi.");
  }

  const mintERC20Call: Call = {
    contractAddress: config.starknetCurrencyContract,
    entrypoint: "mint",
    calldata: CallData.compile([starknetAccount.address, cairo.uint256(amount)])
  };

  const result = await starknetAccount.execute(mintERC20Call, [erc20abi]);
  await provider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
  return result.transaction_hash;
};
