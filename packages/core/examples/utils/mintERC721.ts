import {
  Account,
  Call,
  CallData,
  ProviderInterface,
  type BigNumberish
} from "starknet";

import "dotenv/config";

import { STARKNET_NFT_ADDRESS } from "../constants";

export async function mintERC721(
  provider: ProviderInterface,
  starknetAccount: Account,
  tokenId: BigNumberish
) {
  const { abi: erc721abi } = await provider.getClassAt(STARKNET_NFT_ADDRESS);
  if (erc721abi === undefined) {
    throw new Error("no abi.");
  }

  const mintCall: Call = {
    contractAddress: STARKNET_NFT_ADDRESS,
    entrypoint: "mint",
    calldata: CallData.compile([starknetAccount.address, tokenId])
  };

  const result = await starknetAccount.execute(mintCall, [erc721abi], {
    maxFee: 0
  });

  await provider.waitForTransaction(result.transaction_hash);
}
