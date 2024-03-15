import { shortString, stark } from "starknet";

import { config } from "../examples/config";
import {
  STARKNET_ETH_ADDRESS,
  STARKNET_NFT_ADDRESS
} from "../examples/constants";
import { changeTokenOwner } from "../examples/utils/changeTokenOwner";
import { getCurrentTokenId } from "../examples/utils/getCurrentTokenId";
import { mintERC20 } from "../examples/utils/mintERC20";
import { mintERC721 } from "../examples/utils/mintERC721";
import { whitelistBroker } from "../examples/utils/whitelistBroker";
import {
  approveERC20,
  approveERC721,
  createAccount,
  createOffer,
  fetchOrCreateAccount,
  fulfillOffer,
  getOrderStatus,
  OfferV1
} from "../src";

describe("ArkProject Listing and Offer Fulfillment", () => {
  it("should create an offer and fulfill the offer", async function () {
    const { arkProvider, starknetProvider } = config;

    const solisAdminAccount = await fetchOrCreateAccount(
      config.arkProvider,
      process.env.SOLIS_ADMIN_ADDRESS_DEV,
      process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
    );
    const brokerId = stark.randomAddress();

    await whitelistBroker(config, solisAdminAccount, brokerId);

    // Create a new account for the listing using the provider
    const { account: arkAccount } = await createAccount(arkProvider);

    // Create a new account for fulfilling the offer
    const starknetFulfillerAccount = await fetchOrCreateAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT2_ADDRESS,
      process.env.STARKNET_ACCOUNT2_PRIVATE_KEY
    );

    expect(starknetFulfillerAccount).toBeDefined();

    await mintERC721(starknetProvider, starknetFulfillerAccount);

    const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

    // Define the order details
    const order: OfferV1 = {
      brokerId, // The broker ID
      tokenAddress: STARKNET_NFT_ADDRESS, // The token address
      tokenId, // The ID of the token
      startAmount: 600000000000000000 // The starting amount for the order
    };

    const starknetOffererAccount = await fetchOrCreateAccount(
      starknetProvider,
      process.env.STARKNET_ACCOUNT1_ADDRESS,
      process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
    );

    await mintERC20(
      starknetProvider,
      starknetOffererAccount,
      order.startAmount
    );

    // for allowance
    await approveERC20(config, {
      starknetAccount: starknetOffererAccount,
      contractAddress: STARKNET_ETH_ADDRESS,
      amount: order.startAmount
    });

    // Create the listing on the arkchain using the order details
    const orderHash = await createOffer(config, {
      starknetAccount: starknetOffererAccount,
      arkAccount,
      offer: order
    });

    expect(orderHash).toBeDefined();

    await approveERC721(config, {
      contractAddress: STARKNET_NFT_ADDRESS,
      starknetAccount: starknetFulfillerAccount
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await expect(
      getOrderStatus(config, { orderHash }).then((res) =>
        shortString.decodeShortString(res.orderStatus)
      )
    ).resolves.toEqual("OPEN");

    // Define the fulfill details
    const fulfillOfferInfo = {
      orderHash,
      tokenAddress: order.tokenAddress,
      tokenId: order.tokenId,
      brokerId
    };

    // Fulfill the offer
    await fulfillOffer(config, {
      starknetAccount: starknetFulfillerAccount,
      arkAccount,
      fulfillOfferInfo
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

  it("should create an offer and fail to fulfill the offer because owner of token changed", async function () {
    const { arkProvider, starknetProvider } = config;

    const brokerId = stark.randomAddress();
    const solisAdminAccount = await fetchOrCreateAccount(
      config.arkProvider,
      process.env.SOLIS_ADMIN_ADDRESS_DEV,
      process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
    );

    await whitelistBroker(config, solisAdminAccount, brokerId);

    const { account: arkAccount } = await createAccount(arkProvider);
    // Create a new account for the listing using the provider
    const starknetFulfillerAccount = await fetchOrCreateAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT2_ADDRESS,
      process.env.STARKNET_ACCOUNT2_PRIVATE_KEY
    );

    await mintERC721(config.starknetProvider, starknetFulfillerAccount);
    await approveERC721(config, {
      contractAddress: STARKNET_NFT_ADDRESS,
      starknetAccount: starknetFulfillerAccount
    });

    const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

    // Create a new account for the listing using the provider
    const starknetAccount = await fetchOrCreateAccount(
      config.starknetProvider,
      process.env.STARKNET_ACCOUNT1_ADDRESS,
      process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
    );

    // Define the order details
    const order: OfferV1 = {
      brokerId, // The broker ID
      tokenAddress: STARKNET_NFT_ADDRESS, // The token address
      tokenId: tokenId, // The ID of the token
      startAmount: 600000000000000000, // The starting amount for the order
      currencyAddress: STARKNET_ETH_ADDRESS // The ERC20 address
    };

    await mintERC20(starknetProvider, starknetAccount, order.startAmount);

    // for allowance
    await approveERC20(config, {
      starknetAccount: starknetAccount,
      contractAddress: STARKNET_ETH_ADDRESS,
      amount: order.startAmount
    });

    // Create the offer on the arkchain using the order details
    const orderHash = await createOffer(config, {
      starknetAccount,
      arkAccount,
      offer: order
    });

    expect(orderHash).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { orderStatus: orderStatusBefore } = await getOrderStatus(config, {
      orderHash
    });
    expect(shortString.decodeShortString(orderStatusBefore)).toBe("OPEN");

    expect(starknetFulfillerAccount).toBeDefined();

    // Define the fulfill details
    const fulfill_info = {
      orderHash,
      tokenAddress: order.tokenAddress,
      tokenId: order.tokenId,
      brokerId
    };

    await changeTokenOwner(
      config,
      STARKNET_NFT_ADDRESS,
      starknetFulfillerAccount,
      starknetAccount.address,
      tokenId
    );

    // Fulfill the offer
    await fulfillOffer(config, {
      starknetAccount: starknetFulfillerAccount,
      arkAccount,
      fulfillOfferInfo: fulfill_info
    });

    await new Promise((resolve) => setTimeout(resolve, 7000));
    const { orderStatus: orderStatusBetween } = await getOrderStatus(config, {
      orderHash
    });
    expect(shortString.decodeShortString(orderStatusBetween)).toBe("FULFILLED");
  }, 30000);
});
