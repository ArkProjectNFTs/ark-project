import * as sn from "starknet";

import { loadArtifacts } from "./common";

export async function upgradefreeMintNft(
  artifactsPath: string,
  account: sn.Account,
  provider: sn.RpcProvider,
  contractAddress: string
) {
  const artifacts = loadArtifacts(artifactsPath, "ark_tokens_FreeMintNFT");

  const { class_hash, transaction_hash } = await account.declareIfNot({
    contract: artifacts.sierra,
    casm: artifacts.casm
  });

  if (transaction_hash) {
    await provider.waitForTransaction(transaction_hash);
  }

  const { abi } = await provider.getClassAt(contractAddress);

  if (abi === undefined) {
    throw new Error("no abi.");
  }

  const contract = new sn.Contract(abi, contractAddress, provider);
  contract.connect(account);
  const response = await contract.upgrade(class_hash);
  const transactionHash: string = response.transaction_hash;

  if (transactionHash) {
    await provider.waitForTransaction(transactionHash);
  }

  return new sn.Contract(artifacts.sierra.abi, contractAddress, provider);
}
