import {
  Account,
  cairo,
  CallData,
  RpcProvider,
  type BigNumberish
} from "starknet";

import "dotenv/config";

import { STARKNET_NFT_ADDRESS } from "../constants";

export async function mintERC721(
  provider: RpcProvider,
  starknetAccount: Account,
  tokenId: BigNumberish
) {
  const mintResult = await starknetAccount.execute({
    contractAddress: STARKNET_NFT_ADDRESS,
    entrypoint: "mint",
    calldata: CallData.compile({
      recipient: starknetAccount.address,
      token_id: cairo.uint256(tokenId)
    })
  });
  await provider.waitForTransaction(mintResult.transaction_hash);
}
