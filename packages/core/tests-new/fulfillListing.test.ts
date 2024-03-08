import { BigNumberish, shortString } from "starknet";

import { createAccount, fetchOrCreateAccount } from "../src/actions/account/account";
import { createListing, fulfillListing } from "../src/actions/order";
import { getOrderStatus } from "../src/actions/read";
import { ListingV1 } from "../src/types";
import { generateRandomTokenId, sleep } from "./utils";

import { config } from "../examples/config";
import { whitelistBroker } from "../examples/utils/whitelistBroker";


describe("ArkProject Listing", () => {
  it("should create and fulfill a listing", async () => {
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

    // Create a new account using the provider
    const { account: arkAccount } = await createAccount(arkProvider);
    const { account: starknetAccount } = await createAccount(starknetProvider);

    const order: ListingV1 = {
      brokerId: 123, // The broker ID
      tokenAddress:
        "0x01435498bf393da86b4733b9264a86b58a42b31f8d8b8ba309593e5c17847672", // The token address
      tokenId: generateRandomTokenId(), // The ID of the token
      startAmount: 600000000000000000 // The starting amount for the order
    };

    const orderHash = await createListing(config, {
      starknetAccount,
      arkAccount,
      order
    });

    await sleep(1000);

    const { orderStatus: orderStatusBefore } = await getOrderStatus(config, {
      orderHash
    });

    expect(shortString.decodeShortString(orderStatusBefore)).toBe("OPEN");

    // Create a new accounts for the fulfill using the provider
    const { account: starknetFulfillerAccount } =
      await createAccount(starknetProvider);

    const fulfill_info = {
      orderHash,
      tokenAddress: order.tokenAddress,
      tokenId: order.tokenId,
      brokerId: 123
    };

    fulfillListing(
      config,
      {
        starknetAccount: starknetFulfillerAccount,
        arkAccount,
        fulfillListingInfo: fulfill_info
      }
    );
    await sleep(2000);

    const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
      orderHash
    });

    expect(shortString.decodeShortString(orderStatusAfter)).toBe("FULFILLED");

  }, 30000);
});
