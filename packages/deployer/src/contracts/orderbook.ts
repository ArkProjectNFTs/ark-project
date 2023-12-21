import * as sn from "starknet";

import { loadArtifacts } from "./common";

/**
 * Declare and deploys orderbook contract.
 * Returns the contract object.
 */
export async function deployOrderBook(
  artifactsPath: string,
  account: sn.Account,
  provider: sn.RpcProvider,
  adminAddress: string
): Promise<sn.Contract> {
  const artifacts = loadArtifacts(artifactsPath, "arkchain_orderbook");
  const contractCallData = new sn.CallData(artifacts.sierra.abi);
  const contractConstructor = contractCallData.compile("constructor", {
    admin: adminAddress
  });

  const deployR = await account.declareAndDeploy(
    {
      contract: artifacts.sierra,
      casm: artifacts.casm,
      constructorCalldata: contractConstructor
    },
    {
      maxFee: 0
    }
  );

  if (deployR.declare.transaction_hash) {
    await provider.waitForTransaction(deployR.declare.transaction_hash);
  }

  return new sn.Contract(
    artifacts.sierra.abi,
    deployR.deploy.contract_address,
    provider
  );
}
