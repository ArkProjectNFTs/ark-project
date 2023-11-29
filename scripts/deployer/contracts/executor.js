import * as sn from 'starknet';
import * as common from './common.js';

/**
 * Declare and deploys executor contract.
 * Returns the contract object.
 */
export async function declareDeploy(artifacts_path, account, provider, constructorData) {
    const artifacts = common.load_artifacts(
        artifacts_path,
        "ark_starknet_executor"
    );

    const contractCallData = new sn.CallData(artifacts.sierra.abi);
    const contractConstructor = contractCallData.compile("constructor", {
        admin_address: constructorData.admin_address,
        eth_contract_address: constructorData.eth_contract_address,
        arkchain_orderbook_address: constructorData.arkchain_orderbook_address,
        messaging_address: constructorData.messaging_address,
    });

    // TODO: don't know how to speed up the polling of receipts... it's TOO SLOW!
    const deployR = await account.declareAndDeploy({
        contract: artifacts.sierra,
        casm: artifacts.casm,
        constructorCalldata: contractConstructor,
        salt: 0x6789,
    });

    return new sn.Contract(artifacts.sierra.abi, deployR.deploy.contract_address, provider);
}
