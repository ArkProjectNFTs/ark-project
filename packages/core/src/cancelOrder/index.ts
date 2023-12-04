import {
  Account,
  cairo,
  CairoCustomEnum,
  CairoOption,
  CairoOptionVariant,
  CallData,
  RpcProvider,
  Uint256
} from "starknet";

import { ORDER_BOOK_ADDRESS } from "../constants";
import { signSingleMessage } from "../signer";
import { CancelInfo, FullCancelInfo } from "../types";

const cancelOrder = async (
  provider: RpcProvider,
  account: Account,
  cancelInfo: CancelInfo
) => {
  const fullCancelInfo: FullCancelInfo = {
    order_hash: cancelInfo.order_hash,
    canceller: account.address,
    token_chain_id: "SN_MAIN",
    token_address: cancelInfo.token_address,
    token_id: new CairoOption<Uint256>(
      CairoOptionVariant.Some,
      cairo.uint256(cancelInfo.token_id)
    )
  };

  // Sign the compiled order
  const signInfo = signSingleMessage(fullCancelInfo.order_hash as bigint);
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
