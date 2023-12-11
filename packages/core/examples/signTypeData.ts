import {
  RpcProvider,
  selector,
  shortString,
  Signature,
  typedData
} from "starknet";

import { createAccount } from "../src/actions/account";

const provider = new RpcProvider({
  nodeUrl: "http://0.0.0.0:5050"
});

(async (provider: RpcProvider) => {
  const { account } = await createAccount(provider);
  console.log(account.address);
  // const orderTypeHash = selector.starknetKeccak("Order(orderHash:felt252)");
  // console.log("orderTypeHash: " + orderTypeHash);

  const TypedOrderData = {
    message: {
      orderHash: 1
    },
    domain: {
      name: "Ark",
      chainId: "SN_MAIN",
      version: "1.1"
    },
    types: {
      StarkNetDomain: [
        { name: "name", type: "felt252" },
        { name: "chainId", type: "felt252" },
        { name: "version", type: "felt252" }
      ],
      Order: [{ name: "orderHash", type: "felt252" }]
    },
    primaryType: "Order"
  };

  const data = TypedOrderData;

  console.log(
    typedData.getMessageHash(
      data,
      "0x2284a6517b487be8114013f277f9e2010ac001a24a93e3c48cdf5f8f345a81b"
    )
  );

  // console.log("domain hash: " + domainHash);
  // console.log("-------------------");
  // const voucherHash = typedData.encodeData(
  //   typedDataValidate.types,
  //   "Voucher",
  //   typedDataValidate.message
  // )[1];
  // console.log("voucher hash: " + voucherHash);

  // const orderHash = typedData.getMessageHash(
  //   typedDataValidate,
  //   "0x2284a6517b487be8114013f277f9e2010ac001a24a93e3c48cdf5f8f345a81b"
  // );
  // console.log("typedata hash: " + orderHash);

  // console.log("account address: " + account.address);
  // console.log("publicKey: " + publicKey);
  // console.log("orderTypeHash: " + orderTypeHash);
  // console.log("domainTypeHash: " + domainTypeHash);

  let signer: Signature = await account.signMessage(TypedOrderData);
  if (Array.isArray(signer)) {
    for (const item of signer) {
      console.log(item);
    }
  } else {
    console.log("signer r: " + signer.r);
    console.log("signer s: " + signer.s);
  }
})(provider);
