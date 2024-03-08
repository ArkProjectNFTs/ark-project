import { Contract, shortString } from "starknet";

import {
  approveERC20,
  createAccount, createListing,
  createOffer, fetchOrCreateAccount,
  fulfillOffer,
  getOrderStatus, ListingV1,
  OfferV1
} from "../src";
import { generateRandomTokenId } from "./utils";
import { config } from "../examples/config";
import { whitelistBroker } from "../examples/utils/whitelistBroker";
import { STARKNET_ETH_ADDRESS, STARKNET_NFT_ADDRESS } from "../examples/constants";
import { mintERC20 } from "../examples/utils/mintERC20";
import { mintERC721 } from "../examples/utils/mintERC721";
import { getCurrentTokenId } from "../examples/utils/getCurrentTokenId";
import { changeTokenOwner } from "../examples/utils/changeTokenOwner";
import { getTokenOwner } from "../examples/utils/getTokenOwner";


describe("ArkProject Listing and Offer Fulfillment", () => {
  it("should create an offer and fulfill the offer", async function () {

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

    // Create a new account for the listing using the provider
    const { account: arkAccount } = await createAccount(arkProvider);
    const { account: starknetAccount } = await createAccount(starknetProvider);

    // Define the order details
    const order: OfferV1 = {
      brokerId: 123, // The broker ID
      tokenAddress: STARKNET_NFT_ADDRESS, // The token address
      tokenId: generateRandomTokenId(), // The ID of the token
      startAmount: 600000000000000000, // The starting amount for the order
      currencyAddress: STARKNET_ETH_ADDRESS // The ERC20 address
    };

    await mintERC20(
      starknetProvider,
      starknetAccount,
      order.startAmount
    );

    // for allowance
    await approveERC20(config, {
      starknetAccount: starknetAccount,
      contractAddress: STARKNET_ETH_ADDRESS,
      amount: order.startAmount
    });

    // Create the listing on the arkchain using the order details
    const orderHash = await createOffer(config,{starknetAccount, arkAccount, offer: order });

    expect(orderHash).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await expect(
      getOrderStatus(config, {orderHash}).then((res) =>
        shortString.decodeShortString(res.orderStatus)
      )
    ).resolves.toEqual("OPEN");

    // Create a new account for fulfilling the offer
    const { account: starknetFulfillerAccount } =
      await createAccount(starknetProvider);

    expect(starknetFulfillerAccount).toBeDefined();

    await mintERC20(
      starknetProvider,
      starknetFulfillerAccount,
      order.startAmount
    );

    // for allowance
    await approveERC20(config, {
      starknetAccount: starknetFulfillerAccount,
      contractAddress: STARKNET_ETH_ADDRESS,
      amount: order.startAmount
    });

    // Define the fulfill details
    const fulfill_info = {
      orderHash,
      tokenAddress: order.tokenAddress,
      tokenId: order.tokenId,
      brokerId: 123
    };

    // Fulfill the offer
    await fulfillOffer(
      config,
      {
        starknetAccount: starknetFulfillerAccount,
        arkAccount,
        fulfillOfferInfo: fulfill_info
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    await expect(
      getOrderStatus(config, {orderHash}).then((res) =>
        shortString.decodeShortString(res.orderStatus)
      )
    ).resolves.toEqual("FULFILLED");

  }, 60000);


  it("should create an offer and fail to fulfill because the fulfiller has not enough balance", async function () {

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

    const { account: starknetOwner } = await createAccount(starknetProvider);
    const { account: arkAccount } = await createAccount(arkProvider);

    await mintERC721(config.starknetProvider, starknetOwner);
    const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

    const orderListing: ListingV1 = {
      brokerId: 123,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: 600000000000000000
    };

    await createListing(config, {
      starknetAccount: starknetOwner,
      arkAccount,
      order: orderListing
    });

    // Create a new account for the listing using the provider
    const { account: starknetAccount } = await createAccount(starknetProvider);

    // Define the order details
    const order: OfferV1 = {
      brokerId: 123, // The broker ID
      tokenAddress: STARKNET_NFT_ADDRESS, // The token address
      tokenId, // The ID of the token
      startAmount: 600000000000000000, // The starting amount for the order
      currencyAddress: STARKNET_ETH_ADDRESS // The ERC20 address
    };

    await mintERC20(
      starknetProvider,
      starknetAccount,
      order.startAmount
    );

    // for allowance
    await approveERC20(config, {
      starknetAccount: starknetAccount,
      contractAddress: STARKNET_ETH_ADDRESS,
      amount: order.startAmount
    });

    // Create the offer on the arkchain using the order details
    const orderHash = await createOffer(config,{starknetAccount, arkAccount, offer: order });

    expect(orderHash).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await expect(
      getOrderStatus(config, {orderHash}).then((res) =>
        shortString.decodeShortString(res.orderStatus)
      )
    ).resolves.toEqual("OPEN");


    // Create a new account for fulfilling the offer
    const { account: starknetFulfillerAccount } =
      await createAccount(starknetProvider);

    expect(starknetFulfillerAccount).toBeDefined();

    // Define the fulfill details
    const fulfill_info = {
      orderHash,
      tokenAddress: order.tokenAddress,
      tokenId: order.tokenId,
      brokerId: 123
    };

    // Fulfill the offer
    await fulfillOffer(
      config,
      {
        starknetAccount: starknetFulfillerAccount,
        arkAccount,
        fulfillOfferInfo: fulfill_info
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 4000));

    // it should be rolled back to "OPEN"
    await expect(
      getOrderStatus(config, {orderHash}).then((res) =>
        shortString.decodeShortString(res.orderStatus)
      )
    ).resolves.toEqual("OPEN");

  }, 50000);
});
