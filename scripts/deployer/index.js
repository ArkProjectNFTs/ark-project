// IMPORTANT! Don't upgrade starknetjs, as katana does not support v0.5.x RPC version
// for the moment...
//
import fs from "fs";

import * as sn from "starknet";

import * as appmsg from "./contracts/appchain_messaging.js";
import * as executor from "./contracts/executor.js";
import * as orderbook from "./contracts/orderbook.js";

const STARKGATE =
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

// Deployer script for ark-project contracts.
// Before running the script, both node must be running.
const katana = new sn.RpcProvider({ nodeUrl: "http://127.0.0.1:5050" });
const solis = new sn.RpcProvider({
  nodeUrl: "https://staging.solis.arkproject.dev"
});

// Katana-0 account is used in both Katana and Solis as they use the same
// seed to initialize accounts.
const privkey0 = "0x1800000000300000180000000000030000000000003006001800006600";
const account0 =
  "0x517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973";
const katana_account0 = new sn.Account(katana, account0, privkey0);
const solis_account0 = new sn.Account(solis, account0, privkey0);

const sn_artifacts_path = "../../crates/ark-contracts/starknet/target/dev/";
const arkchain_artifacts_path =
  "../../crates/ark-contracts/arkchain/target/dev/";

let appmsg_contract = await appmsg.declareDeploy(
  sn_artifacts_path,
  katana_account0,
  katana,
  {
    owner: account0,
    appchain_account: account0
  }
);

console.log("executor (sn)", appmsg_contract.address);

let executor_contract = await executor.declareDeploy(
  sn_artifacts_path,
  katana_account0,
  katana,
  {
    admin_address: account0,
    eth_contract_address: STARKGATE,
    arkchain_orderbook_address: 0x1234,
    messaging_address: appmsg_contract.address
  }
);
console.log("executor (sn)", executor_contract.address);

let orderbook_contract = await orderbook.declareDeploy(
  arkchain_artifacts_path,
  solis_account0,
  solis,
  {
    admin: account0
  }
);
console.log("orderbook (ark)", orderbook_contract.address);

// TODO: Solis requires the address of the orderbook + the executor address,
// So if the code changes for any of those contracts, the address must be pre-computed
// using starkli to start Solis accordingly.

// TODO: Create order (SDK).
// TODO: fulfill order (SDK).
// TODO: the messaging should then work.
