import * as sn from 'starknet';
import * as common from './common.js';

/**
 * Declare and deploys appchain_messaging contract.
 * Returns the contract object.
 */
export async function declareDeploy(artifacts_path, account, provider, constructorData) {
    const artifacts = common.load_artifacts(
        artifacts_path,
        "ark_starknet_appchain_messaging"
    );

    const contractCallData = new sn.CallData(artifacts.sierra.abi);
    const contractConstructor = contractCallData.compile("constructor", {
        owner: constructorData.owner,
        appchain_account: constructorData.appchain_account,
    });

    // TODO: don't know how to speed up the polling of receipts... it's TOO SLOW!
    const deployR = await account.declareAndDeploy({
        contract: artifacts.sierra,
        casm: artifacts.casm,
        constructorCalldata: contractConstructor,
        salt: 0x1234,
    });

    return new sn.Contract(artifacts.sierra.abi, deployR.deploy.contract_address, provider);
}
