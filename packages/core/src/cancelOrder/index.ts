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

import { ORDER_BOOK_ADDRESS } from "../constants";
import { signMessage } from "../signer";
import { CancelInfo, FullCancelInfo } from "../types";

const cancelOrder = async (
  provider: RpcProvider,
  account: Account,
  cancelInfo: CancelInfo
) => {
  console.log(account);
  const fullCancelInfo: FullCancelInfo = {
    order_hash: cancelInfo.order_hash,
    canceller: account.address,
    token_chain_id: shortString.encodeShortString("SN_MAIN"),
    token_address: cancelInfo.token_address,
    token_id: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(cancelInfo.token_id)
    )
  };

  // Compile the order data
  let compiledOrder = CallData.compile({
    fullCancelInfo
  });
  let compiledCancelOrder = compiledOrder.map(BigInt);

  // Sign the compiled order
  const signInfo = signMessage(compiledCancelOrder);
  const signer = new CairoCustomEnum({ WEIERSTRESS_STARKNET: signInfo });

  // Compile calldata for the create_order function
  let cancel_order_calldata = CallData.compile({
    cancel_info: fullCancelInfo,
    signer: signer
  });

  // Execute the transaction
  const result = await account.execute({
    contractAddress: ORDER_BOOK_ADDRESS,
    entrypoint: "cancel_order",
    calldata: cancel_order_calldata
  });

  // Wait for the transaction to be processed
  await provider.waitForTransaction(result.transaction_hash, {
    retryInterval: 100
  });
};

export { cancelOrder };
