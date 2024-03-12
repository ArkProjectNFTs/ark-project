import {
  AccountInterface,
  cairo,
  Call,
  CallData,
  type BigNumberish
} from "starknet";

import { Config } from "../../createConfig";

interface ApproveERC721Parameters {
  starknetAccount: AccountInterface;
  contractAddress: string;
}

export const approveERC721 = async (
  config: Config,
  parameters: ApproveERC721Parameters
) => {
  const { contractAddress, starknetAccount } = parameters;

  const { abi: erc721abi } =
    await config.starknetProvider.getClassAt(contractAddress);

  if (erc721abi === undefined) {
    throw new Error("no abi.");
  }

  const approveCall: Call = {
    contractAddress: contractAddress,
    entrypoint: "set_approval_for_all",
    calldata: CallData.compile([config.starknetContracts.executor, true])
  };

  const result = await starknetAccount.execute(approveCall, [erc721abi]);
  await config.starknetProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
};

interface ERC20Parameters {
  starknetAccount: AccountInterface;
  contractAddress: string;
  amount: BigNumberish;
}

export const approveERC20 = async (
  config: Config,
  parameters: ERC20Parameters
) => {
  const { contractAddress, amount, starknetAccount } = parameters;
  const { abi: erc20abi } =
    await config.starknetProvider.getClassAt(contractAddress);

  if (erc20abi === undefined) {
    throw new Error("no abi.");
  }

  const approuveERC20Call: Call = {
    contractAddress,
    entrypoint: "approve",
    calldata: CallData.compile([
      config.starknetContracts.executor,
      cairo.uint256(amount)
    ])
  };

  const result = await starknetAccount.execute(approuveERC20Call, [erc20abi]);

  await config.starknetProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });

  return result;
};

export const increaseERC20 = async (
  config: Config,
  parameters: ERC20Parameters
) => {
  const { contractAddress, amount, starknetAccount } = parameters;
  const { abi: erc20abi } =
    await config.starknetProvider.getClassAt(contractAddress);

  if (erc20abi === undefined) {
    throw new Error("no abi.");
  }

  const increaseERC20Call: Call = {
    contractAddress,
    entrypoint: "increase_allowance",
    calldata: CallData.compile([
      config.starknetContracts.executor,
      cairo.uint256(amount)
    ])
  };

  const result = await starknetAccount.execute(increaseERC20Call, [erc20abi]);

  await config.starknetProvider.waitForTransaction(result.transaction_hash);
};
