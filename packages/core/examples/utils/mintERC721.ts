import {
  Account,
  Contract,
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

  const erc721Contract = new Contract(
    erc721abi,
    STARKNET_NFT_ADDRESS,
    provider
  );

  erc721Contract.connect(starknetAccount);
  const mintCall = erc721Contract.populate("mint", [
    starknetAccount.address,
    1
  ]);

  const res = await erc721Contract.mint(mintCall.calldata);
  await provider.waitForTransaction(res.transaction_hash);
}
