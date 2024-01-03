import {
  Account,
  AccountInterface,
  cairo,
  CallData,
  ProviderInterface,
  RpcProvider,
  type BigNumberish
} from "starknet";

export const approveERC721 = async (
  provider: ProviderInterface,
  account: AccountInterface,
  contractAddress: string,
  to: BigNumberish,
  tokenId: BigNumberish
) => {
  // console.log("contractAddress", contractAddress);

  // const { abi: testAbi } = await provider.getClassAt(contractAddress);
  // if (testAbi === undefined) {
  //   throw new Error("no abi.");
  // }
  // console.log(testAbi);

  // const isApproved = await account.callContract({
  //   contractAddress,
  //   entrypoint: "get_approved",
  //   calldata: CallData.compile({
  //     token_id: cairo.uint256(tokenId)
  //   })
  // });

  // console.log("=> isApproved", isApproved);

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
