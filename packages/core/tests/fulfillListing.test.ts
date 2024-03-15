import { stark, shortString } from "starknet";

import { config } from "../examples/config";
import {
  STARKNET_ETH_ADDRESS,
  STARKNET_NFT_ADDRESS
} from "../examples/constants";
import { getCurrentTokenId } from "../examples/utils/getCurrentTokenId";
import { mintERC20 } from "../examples/utils/mintERC20";
import { mintERC721 } from "../examples/utils/mintERC721";
import { whitelistBroker } from "../examples/utils/whitelistBroker";
import {
  approveERC20,
  approveERC721,
  createAccount,
  createListing,
  fulfillListing,
  ListingV1
} from "../src";
import { fetchOrCreateAccount } from "../src/actions/account/account";
import { getOrderStatus } from "../src/actions/read";

describe("ArkProject Listing", () => {
  it("should create and fulfill a listing", async () => {
    const brokerId = stark.randomAddress();
    const { arkProvider, starknetProvider } = config;
    const { account: arkAccount } = await createAccount(arkProvider);
    console.log(brokerId);
    const solisAdminAccount = await fetchOrCreateAccount(
      config.arkProvider,
      process.env.SOLIS_ADMIN_ADDRESS_DEV!,
      process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV!
    );

    await whitelistBroker(config, solisAdminAccount, brokerId.toString());

    const starknetOffererAccount = await fetchOrCreateAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT1_ADDRESS!,
      process.env.STARKNET_ACCOUNT1_PRIVATE_KEY!
    );

    const transaction_hash = await mintERC721(
      starknetProvider,
      starknetOffererAccount
    );
    expect(transaction_hash).toBeDefined();

    const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);
    expect(tokenId).toBeDefined();

    await approveERC721(config, {
      contractAddress: STARKNET_NFT_ADDRESS,
      starknetAccount: starknetOffererAccount
    });

    const order: ListingV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: "100000000000000000"
    };

    const orderHash = await createListing(config, {
      starknetAccount: starknetOffererAccount,
      arkAccount,
      order
    });
    expect(orderHash).toBeDefined();

    const { orderStatus: orderStatusBefore } = await getOrderStatus(config, {
      orderHash
    });

    expect(shortString.decodeShortString(orderStatusBefore)).toBe("OPEN");

    const starknetFulfillerAccount = await fetchOrCreateAccount(
      starknetProvider,
      process.env.STARKNET_ACCOUNT2_ADDRESS!,
      process.env.STARKNET_ACCOUNT2_PRIVATE_KEY!
    );

    if (process.env.STARKNET_NETWORK_ID === "dev") {
      await mintERC20(
        starknetProvider,
        starknetFulfillerAccount,
        order.startAmount
      );
    }

    await approveERC20(config, {
      starknetAccount: starknetFulfillerAccount,
      contractAddress: STARKNET_ETH_ADDRESS,
      amount: order.startAmount
    });

    const fulfillListingInfo = {
      orderHash,
      tokenAddress: order.tokenAddress,
      tokenId,
      brokerId
    };

    await fulfillListing(config, {
      starknetAccount: starknetFulfillerAccount,
      arkAccount,
      fulfillListingInfo
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));
    const { orderStatus: orderStatusBetween } = await getOrderStatus(config, {
      orderHash
    });
    expect(shortString.decodeShortString(orderStatusBetween)).toBe("FULFILLED");

    await new Promise((resolve) => setTimeout(resolve, 5000));
    const { orderStatus: orderStatusAfter } = await getOrderStatus(config, {
      orderHash
    });
    expect(shortString.decodeShortString(orderStatusAfter)).toBe("EXECUTED");
  }, 30000);
});
