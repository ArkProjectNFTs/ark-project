import { RpcProvider } from "starknet";

import { createAccount } from "../src/actions/account/account";

// Initialize the RPC provider with the katana node URL for starknet
const arkProvider = new RpcProvider({
  nodeUrl: process.env.ARKCHAIN_RPC_URL ?? "http://0.0.0.0:7777"
});

createAccount(arkProvider).then(
  ({ address, privateKey, publicKey, account }) => {
    console.log("address: " + address);
    console.log("privateKey: " + privateKey);
    console.log("publicKey: " + publicKey);
    console.log(account);
  }
);
