// IMPORTANT! Don't upgrade starknetjs, as katana does not support v0.5.x RPC version
// for the moment...
//

import * as dotenv from "dotenv";
import * as sn from "starknet";

import * as appmsg from "./contracts/appchain_messaging.js";
import * as executor from "./contracts/executor.js";
import * as orderbook from "./contracts/orderbook.js";

dotenv.config();
const STARKGATE =
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

// Deployer script for ark-project contracts.
// Before running the script, both node must be running.
const snRpc = new sn.RpcProvider({ nodeUrl: process.env.SN_RPC });
const solisRpc = new sn.RpcProvider({
  nodeUrl: process.env.SOLIS_RPC
});

// Katana-0 account is used in both Katana and Solis as they use the same
// seed to initialize accounts.
const snPrivKey = process.env.SN_PRIV_KEY;
const snAccount = process.env.SN_ACCOUNT;
const solisPrivKey = process.env.SOLIS_PRIV_KEY;
const solisAccount = process.env.SOLIS_ACCOUNT;
const sn_account = new sn.Account(snRpc, snAccount, snPrivKey);
const solis_account = new sn.Account(solisRpc, solisAccount, solisPrivKey);

const sn_artifacts_path = "../../crates/ark-contracts/starknet/target/dev/";
const arkchain_artifacts_path =
  "../../crates/ark-contracts/arkchain/target/dev/";

let appmsg_contract = await appmsg.declareDeploy(
  sn_artifacts_path,
  sn_account,
  snRpc,
  {
    owner: snAccount,
    appchain_account: solisAccount
  }
);

console.log("appmessaging (sn)", appmsg_contract.address);

let executor_contract = await executor.declareDeploy(
  sn_artifacts_path,
  sn_account,
  snRpc,
  {
    admin_address: snAccount,
    eth_contract_address: STARKGATE,
    arkchain_orderbook_address: process.env.ORDERBOOK_ADDRESS,
    messaging_address: appmsg_contract.address
  }
);
console.log("executor (sn)", executor_contract.address);

let orderbook_contract = await orderbook.declareDeploy(
  arkchain_artifacts_path,
  solis_account,
  solisRpc,
  {
    admin: solis_account
  }
);
console.log("orderbook (ark)", orderbook_contract.address);
