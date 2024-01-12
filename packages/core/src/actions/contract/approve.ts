import { Account, cairo, CallData, type BigNumberish } from "starknet";

import { Config } from "../../createConfig";

interface ApproveERC721Parameters {
  starknetAccount: Account;
  tokenId: BigNumberish;
  contractAddress: string;
}

export const approveERC721 = async (
  config: Config,
  parameters: ApproveERC721Parameters
) => {
  console.log(config.starknetContracts.executor);
  const { contractAddress, tokenId, starknetAccount } = parameters;
  const result = await starknetAccount.execute({
    contractAddress,
    entrypoint: "approve",
    calldata: CallData.compile({
      to: config.starknetContracts.executor,
      token_id: cairo.uint256(tokenId)
    })
  });

  await config.starknetProvider.waitForTransaction(result.transaction_hash);
};

interface ApproveERC20Parameters {
  starknetAccount: Account;
  contractAddress: string;
  amount: BigNumberish;
}

export const approveERC20 = async (
  config: Config,
  parameters: ApproveERC20Parameters
) => {
  const { contractAddress, amount, starknetAccount } = parameters;
  const result = await starknetAccount.execute({
    contractAddress,
    entrypoint: "approve",
    calldata: CallData.compile({
      spender: config.starknetContracts.executor,
      amount: cairo.uint256(amount)
    })
  });

  await config.starknetProvider.waitForTransaction(result.transaction_hash);
};
