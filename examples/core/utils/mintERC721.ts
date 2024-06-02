import { Account, Call, CallData, ProviderInterface } from "starknet";

import "dotenv/config";
import { nftContract } from "../config/index.js";

export async function mintERC721(
  provider: ProviderInterface,
  starknetAccount: Account
) {
  const { abi: erc721abi } = await provider.getClassAt(nftContract);
  if (erc721abi === undefined) {
    throw new Error("no abi.");
  }

  const mintCall: Call = {
    contractAddress: nftContract,
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
