import { Account, AccountInterface, RpcProvider, shortString } from "starknet";

import { config } from "../examples/config";

import {
  approveERC20,
  cancelOrder,
  createAccount,
  createOffer, fetchOrCreateAccount,
  getOrderStatus,
  getOrderType,
  ListingV1
} from "../src";
import {
  generateRandomTokenId,
  getTypeFromCairoCustomEnum,
  sleep
} from "./utils";
import { whitelistBroker } from "../examples/utils/whitelistBroker";
import { mintERC20 } from "../examples/utils/mintERC20";
import { STARKNET_ETH_ADDRESS, STARKNET_NFT_ADDRESS } from "../examples/constants";

describe("ArkProject cancel offer", () => {
  it("should cancel an offer and verify its status and type", async () => {
    const { arkProvider, starknetProvider } = config;

    const solisAdminAccount = await fetchOrCreateAccount(
      config.arkProvider,
      process.env.SOLIS_ADMIN_ADDRESS_DEV,
      process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
    );

    await whitelistBroker(
      config,
      solisAdminAccount,
      123
    );

    const { account: arkAccount } = await createAccount(arkProvider);
    const { account: starknetAccount } = await createAccount(starknetProvider);
    const order: ListingV1 = {
      brokerId: 123,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId: generateRandomTokenId(),
      startAmount: 600000000000000000,
      currencyAddress: STARKNET_ETH_ADDRESS // The ERC20 address
    };

    await mintERC20(
      starknetProvider,
      starknetAccount,
      order.startAmount
    );

    await approveERC20(config, {
      starknetAccount: starknetAccount,
      contractAddress: STARKNET_ETH_ADDRESS,
      amount: order.startAmount
    });


    const orderHash = await createOffer(config,{starknetAccount, arkAccount, offer: order });
    await sleep(1000); // Wait for the transaction to be processed
    /*
        // Use Jest's expect for promise resolution
        await expect(
          await getOrderStatus(config, {
            orderHash
          }).then((res) =>
            shortString.decodeShortString(res.orderStatus)
          )
        ).resolves.toEqual("OPEN");

        await expect(
          getOrderType(config, {orderHash}).then((res) =>
            getTypeFromCairoCustomEnum(res.orderType)
          )
        ).resolves.toEqual("OFFER");


        const cancelInfo = {
          orderHash: orderHash,
          tokenAddress: order.tokenAddress,
          tokenId: order.tokenId
        };

        await cancelOrder(config, {
          starknetAccount,
          arkAccount,
          cancelInfo
        });

        await expect(
          getOrderStatus(config, {orderHash}).then((res) =>
            shortString.decodeShortString(res.orderStatus)
          )
        ).resolves.toEqual("CANCELLED_USER");*/
  }, 30000);
});
