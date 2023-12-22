import {
  Account,
  cairo,
  CallData,
  RpcProvider,
  type BigNumberish
} from "starknet";

/**
 * Executes an approval transaction for ERC721 or ERC20 tokens.
 * @param provider - The RpcProvider to use for the transaction.
 * @param account - The account performing the transaction.
 * @param contractAddress - The address of the token contract.
 * @param entrypoint - The contract entrypoint (function) to call.
 * @param parameters - The parameters for the contract call.
 */
async function executeApproval(
  provider: RpcProvider,
  account: Account,
  contractAddress: string,
  entrypoint: string,
  parameters: { [key: string]: BigNumberish }
) {
  try {
    const calldata = CallData.compile(
      Object.fromEntries(
        Object.entries(parameters).map(([key, value]) => [
          key,
          cairo.uint256(value)
        ])
      )
    );

    const result = await account.execute({
      contractAddress,
      entrypoint,
      calldata
    });

    await provider.waitForTransaction(result.transaction_hash);
  } catch (error) {
    console.error("Approval transaction failed:", error);
    throw error;
  }
}

export const approveERC721 = async (
  provider: RpcProvider,
  account: Account,
  contractAddress: string,
  to: BigNumberish,
  tokenId: BigNumberish
) => {
  await executeApproval(provider, account, contractAddress, "approve", {
    to,
    tokenId
  });
};

export const approveERC20 = async (
  provider: RpcProvider,
  account: Account,
  contractAddress: string,
  spender: BigNumberish,
  amount: BigNumberish
) => {
  await executeApproval(provider, account, contractAddress, "approve", {
    spender,
    amount
  });
};
