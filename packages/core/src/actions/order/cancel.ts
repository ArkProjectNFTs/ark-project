import * as starknet from "@scure/starknet";
import {
  Account,
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
  starknetAccount: Account,
  arkAccount: Account,
  cancelInfo: CancelInfo
) => {
  const fullCancelInfo: FullCancelInfo = {
    order_hash: cancelInfo.order_hash,
    canceller: starknetAccount.address,
    token_chain_id: shortString.encodeShortString("SN_MAIN"),
    token_address: cancelInfo.token_address,
    token_id: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(cancelInfo.token_id)
    )
  };

  // Compile the orderhash
  let compiledOrder = CallData.compile({
    fullCancelInfo
  });
  let compiledCancelInfo = compiledOrder.map(BigInt);

  // Sign the compiled order
  const TypedOrderData = {
    message: {
      hash: starknet.poseidonHashMany(compiledCancelInfo)
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

  const signInfo = await getSignInfos(TypedOrderData, starknetAccount);
  const signer = new CairoCustomEnum({ WEIERSTRESS_STARKNET: signInfo });
  // Compile calldata for the create_order function
  let create_order_calldata = CallData.compile({
    order: fullCancelInfo,
    signer: signer
  });

  // Execute the transaction
  const result = await arkAccount.execute({
    contractAddress: ORDER_BOOK_ADDRESS,
    entrypoint: "cancel_order",
    calldata: create_order_calldata
  });

  // Wait for the transaction to be processed
  await arkProvider.waitForTransaction(result.transaction_hash, {
    retryInterval: 1000
  });
};

export { cancelOrder };
