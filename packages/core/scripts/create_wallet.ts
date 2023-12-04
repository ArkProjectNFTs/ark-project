import { RpcProvider } from "starknet";

import { createAccount } from "../src/account";

const provider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:7777"
});

createAccount(provider).then(({ address, privateKey, publicKey, account }) => {
  console.log("address: " + address);
  console.log("privateKey: " + privateKey);
  console.log("publicKey: " + publicKey);
  console.log(account);
});
