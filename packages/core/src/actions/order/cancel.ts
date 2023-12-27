import * as starknet from "@scure/starknet";
import {
  Account,
  AccountInterface,
  cairo,
  CairoCustomEnum,
  CairoOption,
  CairoOptionVariant,
  CallData,
  RpcProvider,
  shortString,
  Uint256
} from "starknet";

import { ORDER_BOOK_ADDRESS } from "../../constants";
import { getSignInfos } from "../../signer";
import { CancelInfo, FullCancelInfo } from "../../types";

const cancelOrder = async (
  arkProvider: RpcProvider,
  starknetAccount: AccountInterface,
  arkAccount: Account,
  cancelInfo: CancelInfo,
  owner?: string
) => {
  console.log("cancelInfo" + cancelInfo);
  const fullCancelInfo: FullCancelInfo = {
    order_hash: cancelInfo.orderHash,
    canceller: starknetAccount.address,
    token_chain_id: shortString.encodeShortString("SN_MAIN"),
    token_address: cancelInfo.tokenAddress,
    token_id: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(cancelInfo.tokenId)
    )
  };
  console.log("fullCancelInfo" + fullCancelInfo);
  // Compile the orderhash
  let compiledOrder = CallData.compile({
    fullCancelInfo
  });
  console.log("compiledOrder" + compiledOrder);
  let compiledCancelInfo = compiledOrder.map(BigInt);
  console.log("compiledCancelInfo" + compiledCancelInfo);
  // Sign the compiled order
  const TypedOrderData = {
    message: {
      hash: starknet.poseidonHashMany(compiledCancelInfo).toString()
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
      Order: [{ name: "hash", type: "felt252" }]
    },
    primaryType: "Order"
  };
  console.log("TypedOrderData" + TypedOrderData);

  const signInfo = await getSignInfos(TypedOrderData, starknetAccount, owner);
  console.log("signInfo" + signInfo);
  const signer = new CairoCustomEnum({ WEIERSTRESS_STARKNET: signInfo });
  console.log("signer" + signer);
  // Compile calldata for the cancel_order function
  let cancel_order_calldata = CallData.compile({
    order: fullCancelInfo,
    signer: signer
  });
  console.log("cancel_order_calldata" + cancel_order_calldata);
  // Execute the transaction
  const result = await arkAccount.execute({
    contractAddress: ORDER_BOOK_ADDRESS,
    entrypoint: "cancel_order",
    calldata: cancel_order_calldata
  });

  // Wait for the transaction to be processed
  await arkProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
};

export { cancelOrder };
