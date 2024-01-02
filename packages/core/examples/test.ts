import * as dotenv from "dotenv";
import { cairo, CallData, RpcProvider } from "starknet";

import { fetchOrCreateAccount } from "../src/actions/account/account";
import { approveERC20 } from "../src/actions/contract";
import {
  STARKNET_ADMIN_ACCOUNT_ADDRESS,
  STARKNET_ETH_ADDRESS,
  STARKNET_EXECUTOR_ADDRESS
} from "../src/constants";

dotenv.config();

const starknetProvider = new RpcProvider({
  nodeUrl: process.env.STARKNET_RPC_URL || ""
});

(async () => {
  const makerAddress = await fetchOrCreateAccount(
    starknetProvider,
    process.env.ACCOUNT1_ADDRESS,
    process.env.ACCOUNT1_PRIVATE_KEY
  );

  const starknetFulfillerAccount = await fetchOrCreateAccount(
    starknetProvider,
    process.env.ACCOUNT2_ADDRESS,
    process.env.ACCOUNT2_PRIVATE_KEY
  );

  //   console.log("Minting ETH...");
  //   const mintResult = await starknetFulfillerAccount.execute({
  //     contractAddress: STARKNET_ETH_ADDRESS,
  //     entrypoint: "mint",
  //     calldata: CallData.compile({
  //       recipient: starknetFulfillerAccount.address,
  //       amount: cairo.uint256(10000000000000000000)
  //     })
  //   });
  //   await starknetProvider.waitForTransaction(mintResult.transaction_hash);

  const balanceOf = await starknetFulfillerAccount.callContract({
    contractAddress: STARKNET_ETH_ADDRESS,
    entrypoint: "balance_of",
    calldata: CallData.compile({
      account: starknetFulfillerAccount.address
    })
  });

  console.log("=> Balance:", balanceOf.result.toString());

  await approveERC20(
    starknetProvider,
    starknetFulfillerAccount,
    STARKNET_ETH_ADDRESS,
    starknetFulfillerAccount.address,
    BigInt(100)
  );

  // from => "0x05686a647a9cdd63ade617e0baf3b364856b813b508f03903eb58a7e622d5855",
  // to => "0x0517ececd29116499f4a1b64b094da79ba08dfd54a3edaa316134c41f8160973",
  // ethContract => "0x0461003257aec8b23c6d338ab1a4a0ea0afb35fae83abd3cd87087b6310644fb"

  //   const result = await starknetFulfillerAccount.execute({
  //     contractAddress: STARKNET_ETH_ADDRESS,
  //     entrypoint: "transfer_from",
  //     calldata: CallData.compile({
  //       sender: starknetFulfillerAccount.address,
  //       recipient: makerAddress.address,
  //       amount: cairo.uint256(1)
  //     })
  //   });

  const result = await starknetFulfillerAccount.execute({
    contractAddress: STARKNET_EXECUTOR_ADDRESS,
    entrypoint: "swap_eth",
    calldata: CallData.compile({
      from: starknetFulfillerAccount.address,
      to: makerAddress.address,
      amount: cairo.uint256(1),
      payment_currency_address: STARKNET_ETH_ADDRESS
    })
  });

  await starknetProvider.waitForTransaction(result.transaction_hash);
  console.log("=> done");
})();
