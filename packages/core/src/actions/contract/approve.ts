import {
  Account,
  AccountInterface,
  cairo,
  CallData,
  RpcProvider,
  type BigNumberish
} from "starknet";

export const approveERC721 = async (
  provider: RpcProvider,
  account: AccountInterface,
  contractAddress: string,
  to: BigNumberish,
  tokenId: BigNumberish
) => {
  const result = await account.execute({
    contractAddress,
    entrypoint: "approve",
    calldata: CallData.compile({
      to,
      token_id: cairo.uint256(tokenId)
    })
  });

  await provider.waitForTransaction(result.transaction_hash);
};

export const approveERC20 = async (
  provider: RpcProvider,
  account: Account,
  contractAddress: string,
  spender: BigNumberish,
  amount: BigNumberish
) => {
  const result = await account.execute({
    contractAddress,
    entrypoint: "approve",
    calldata: CallData.compile({
      spender,
      amount: cairo.uint256(amount)
    })
  });

  await provider.waitForTransaction(result.transaction_hash);
};
