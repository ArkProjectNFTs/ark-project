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
  const artifacts = loadArtifacts(artifactsPath, "ark_orderbook_orderbook");
  const contractCallData = new sn.CallData(artifacts.sierra.abi);

  const deployR = await account.declareAndDeploy({
    contract: artifacts.sierra,
    casm: artifacts.casm,
    constructorCalldata: contractCallData.compile("constructor", {
      admin: adminAddress
    } as sn.RawArgs)
  });

  if (deployR.declare.transaction_hash) {
    await provider.waitForTransaction(deployR.declare.transaction_hash);
  }

  return new sn.Contract(
    artifacts.sierra.abi,
    deployR.deploy.contract_address,
    provider
  );
}

export async function updateExecutorAddress(
  provider: sn.RpcProvider,
  deployerAccount: sn.Account,
  contractAddress: string,
  executorAddress: string
) {
  const { abi } = await provider.getClassAt(contractAddress);
  if (abi === undefined) {
    throw new Error("no abi.");
  }
  const executorContract = new sn.Contract(abi, contractAddress, provider);
  executorContract.connect(deployerAccount);
  const response =
    await executorContract.update_starknet_executor_address(executorAddress);
  await provider.waitForTransaction(response.transaction_hash);
}
