import {
  RpcProvider,
  selector,
  shortString,
  TypedData,
  typedData
} from "starknet";

import { createAccount } from "../src/actions/account/account";

const provider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:5050"
});

(async (provider: RpcProvider) => {
  // const { account, publicKey } = await createAccount(provider);
  // const orderTypeHash = selector.starknetKeccak(
  //   "Voucher(receiver:felt252,tokenId:u256,amount:u256,salt:felt252)u256(low:felt252,high:felt252)"
  // );
  // const domainTypeHash = selector.starknetKeccak(
  //   "StarkNetDomain(name:felt252,chainId:felt252,version:felt252)"
  // );

  const typedDataValidate: TypedData = {
    types: {
      StarkNetDomain: [
        { name: "name", type: "felt" },
        { name: "version", type: "felt" },
        { name: "chainId", type: "felt" }
      ],
      Voucher: [
        { name: "receiver", type: "felt" },
        { name: "token_id", type: "u256" },
        { name: "amount", type: "u256" },
        { name: "salt", type: "felt" }
      ],
      u256: [
        { name: "low", type: "felt" },
        { name: "high", type: "felt" }
      ]
    },
    primaryType: "Voucher",
    domain: {
      name: "Rules",
      chainId: "SN_MAIN",
      version: "1.1"
    },
    message: {
      receiver: 0x1,
      token_id: { low: 2, high: 3 },
      amount: { low: 4, high: 5 },
      salt: 6
    }
  };

  const domainHash = typedData.encodeData(
    typedDataValidate.types,
    "StarkNetDomain",
    typedDataValidate.domain
  )[1];

  console.log("domain hash: " + domainHash);
  console.log("-------------------");
  const voucherHash = typedData.encodeData(
    typedDataValidate.types,
    "Voucher",
    typedDataValidate.message
  )[1];
  console.log("voucher hash: " + voucherHash);
  // const orderHash = typedData.getMessageHash(typedDataValidate, 0x7369676e6572);

  // console.log("account address: " + account.address);
  // console.log("publicKey: " + publicKey);
  // console.log("orderTypeHash: " + orderTypeHash);
  // console.log("domainTypeHash: " + domainTypeHash);
  // console.log("typedata hash: " + orderHash);
  // let signer: Signature = await account.signMessage(typedDataValidate);
  // if (Array.isArray(signer)) {
  //   for (const item of signer) {
  //     console.log(item);
  //   }
  // } else {
  //   console.log("signer r: " + signer.r);
  //   console.log("signer s: " + signer.s);
  // }
})(provider);
