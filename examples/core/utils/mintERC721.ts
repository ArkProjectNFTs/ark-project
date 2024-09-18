import {
  type Account,
  type Call,
  CallData,
  type ProviderInterface
} from "starknet";

import "dotenv/config";

export async function mintERC721(
  provider: ProviderInterface,
  starknetAccount: Account,
  contractAddress: string
) {
  const { abi: erc721abi } = await provider.getClassAt(contractAddress);
  if (erc721abi === undefined) {
    throw new Error("no abi.");
  }

  const mintCall: Call = {
    contractAddress: contractAddress,
    entrypoint: "mint",
    calldata: CallData.compile({
      recipient: starknetAccount.address,
      token_uri: `https://api.everai.xyz/m/1`
    })
  };

  const result = await starknetAccount.execute(mintCall, [erc721abi]);

  await provider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
  return result.transaction_hash;
}
