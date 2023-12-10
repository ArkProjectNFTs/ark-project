import * as dotenv from "dotenv";
import * as sn from "starknet";

import * as orderbook from "./contracts/orderbook.js";

dotenv.config();

const solisRpc = new sn.RpcProvider({
  nodeUrl: process.env.SOLIS_RPC
});

const solisPrivKey = process.env.SOLIS_PRIV_KEY;
const solisAccount = process.env.SOLIS_ACCOUNT;
const solis_account = new sn.Account(solisRpc, solisAccount, solisPrivKey);

const arkchain_artifacts_path =
  "../../crates/ark-contracts/arkchain/target/dev/";

let orderbook_contract = await orderbook.declareDeploy(
  arkchain_artifacts_path,
  solis_account,
  solisRpc,
  {
    admin: solisAccount
  }
);
console.log("orderbook (ark)", orderbook_contract.address);
