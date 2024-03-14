import * as sn from "starknet";

import * as common from "./common";

function getArtifacts(artifactsPath: string) {
  return common.loadArtifacts(artifactsPath, "ark_starknet_ark_router");
}

/**
 * Declare and deploys executor contract.
 * Returns the contract object.
 */
export async function deployRouter(
  artifactsPath: string,
  account: sn.Account,
  provider: sn.RpcProvider
) {
  const artifacts = getArtifacts(artifactsPath);
  const chain_id = await provider.getChainId();
  console.log("chain_id", chain_id);
  const contractCallData = new sn.CallData(artifacts.sierra.abi);
  const contractConstructor = contractCallData.compile("constructor", {
    admin_address: account.address
  });

  const deployR = await account.declareAndDeploy({
    contract: artifacts.sierra,
    casm: artifacts.casm,
    constructorCalldata: contractConstructor
  });

  return new sn.Contract(
    artifacts.sierra.abi,
    deployR.deploy.contract_address,
    provider
  );
}
