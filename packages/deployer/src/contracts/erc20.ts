import * as sn from "starknet";

import { loadArtifacts } from "./common";

/**
 * Declare and deploys orderbook contract.
 * Returns the contract object.
 */
export async function deployERC20(
  artifactsPath: string,
  account: sn.Account,
  provider: sn.RpcProvider,
  name: string,
  symbol: string
): Promise<sn.Contract> {
  const artifacts = loadArtifacts(artifactsPath, "ark_common_FreeMintERC20");
  const contractCallData = new sn.CallData(artifacts.sierra.abi);
  const contractConstructor = contractCallData.compile("constructor", {
    initial_supply: sn.cairo.uint256(0),
    name,
    symbol
  });

  const deployR = await account.declareAndDeploy(
    {
      contract: artifacts.sierra,
      casm: artifacts.casm,
      constructorCalldata: contractConstructor,
      salt: "1337"
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
