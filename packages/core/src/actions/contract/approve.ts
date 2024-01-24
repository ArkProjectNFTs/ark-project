import { AccountInterface, cairo, CallData, type BigNumberish } from "starknet";

import { Config } from "../../createConfig";

interface ApproveERC721Parameters {
  starknetAccount: AccountInterface;
  tokenId: BigNumberish;
  contractAddress: string;
}

export const approveERC721 = async (
  config: Config,
  parameters: ApproveERC721Parameters
) => {
  const { contractAddress, starknetAccount } = parameters;
  const result = await starknetAccount.execute({
    contractAddress,
    entrypoint: "set_approval_for_all",
    calldata: CallData.compile({
      operator: config.starknetContracts.executor,
      approved: true
    })
  });

  await config.starknetProvider.waitForTransaction(result.transaction_hash);
};

interface ApproveERC20Parameters {
  starknetAccount: AccountInterface;
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
    entrypoint: "increase_allowance",
    calldata: CallData.compile({
      spender: config.starknetContracts.executor,
      addedValue: cairo.uint256(amount)
    })
  });

  await config.starknetProvider.waitForTransaction(result.transaction_hash);
};
