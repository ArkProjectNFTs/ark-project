import { Account, CallData, Contract, RpcProvider } from "starknet";

import { loadArtifacts } from "../contracts/common";

export async function deployERC721(
  artifactsPath: string,
  deployerAccount: Account,
  provider: RpcProvider,
  name: string,
  symbol: string
) {
  const artifacts = loadArtifacts(artifactsPath, "ark_tokens_FreeMintNFT");

  const contractCallData = new CallData(artifacts.sierra.abi);
  const contractConstructor = contractCallData.compile("constructor", {
    name: name,
    symbol: symbol,
    base_uri:
      "https://ipfs.io/ipfs/QmVXJ2eEx3xrD2mSdPqLBEEYM5obj6DRYkn5yant6rXPmw/"
  });

  const deployR = await deployerAccount.declareAndDeploy({
    contract: artifacts.sierra,
    casm: artifacts.casm,
    constructorCalldata: contractConstructor
  });

  return new Contract(
    artifacts.sierra.abi,
    deployR.deploy.contract_address,
    provider
  );
}
