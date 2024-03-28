import { shortString, stark } from "starknet";

import { config } from "../examples/config";
import {
  STARKNET_ETH_ADDRESS,
  STARKNET_EXECUTOR_ADDRESS,
  STARKNET_NFT_ADDRESS
} from "../examples/constants";
import { changeTokenOwner } from "../examples/utils/changeTokenOwner";
import { getBalance } from "../examples/utils/getBalance";
import { getCurrentTokenId } from "../examples/utils/getCurrentTokenId";
import { mintERC20 } from "../examples/utils/mintERC20";
import { mintERC721 } from "../examples/utils/mintERC721";
import { setArkFees } from "../examples/utils/setArkFees";
import { setBrokerFees } from "../examples/utils/setBrokerFees";
import { whitelistBroker } from "../examples/utils/whitelistBroker";
import {
  approveERC20,
  approveERC721,
  createAccount, createListing,
  createOffer,
  fetchOrCreateAccount,
  fulfillOffer,
  getOrderStatus, ListingV1,
  OfferV1
} from "../src";

describe("ArkProject Listing and Offer Fulfillment", () => {
  /*it("should create an offer and fulfill the offer", async function () {
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
  }, 30000);*/

  it("should create an offer and fulfill the offer then create a new listing", async function () {
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

    const starknetOffererAccount = await fetchOrCreateAccount(
      starknetProvider,
      process.env.STARKNET_ACCOUNT1_ADDRESS,
      process.env.STARKNET_ACCOUNT1_PRIVATE_KEY
    );


    expect(starknetFulfillerAccount).toBeDefined();

    await mintERC721(starknetProvider, starknetFulfillerAccount);

    const tokenId = await getCurrentTokenId(config, STARKNET_NFT_ADDRESS);

    const orderListing1: ListingV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: 600000000000000000
    };

    const orderHashListing = await createListing(config, {
      starknetAccount: starknetFulfillerAccount,
      arkAccount,
      order: orderListing1
    });
    expect(orderHashListing).toBeDefined();

    // Define the order details
    const order: OfferV1 = {
      brokerId, // The broker ID
      tokenAddress: STARKNET_NFT_ADDRESS, // The token address
      tokenId, // The ID of the token
      startAmount: 600000000000000000 // The starting amount for the order
    };

    const allowanceAndBalance = 99900000000000000000;

    await mintERC20(
      starknetProvider,
      starknetOffererAccount,
      allowanceAndBalance
    );

    // for allowance
    await approveERC20(config, {
      starknetAccount: starknetOffererAccount,
      contractAddress: STARKNET_ETH_ADDRESS,
      amount: allowanceAndBalance
    });

    await mintERC20(
      starknetProvider,
      starknetFulfillerAccount,
      allowanceAndBalance
    );

    // for allowance
    await approveERC20(config, {
      starknetAccount: starknetFulfillerAccount,
      contractAddress: STARKNET_ETH_ADDRESS,
      amount: allowanceAndBalance
    });

    // Create the offer on the arkchain using the order details
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

    await approveERC721(config, {
      contractAddress: STARKNET_NFT_ADDRESS,
      starknetAccount: starknetOffererAccount
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

    // now the Owner is starknetFulfillerAccount
    // Create the listing on the arkchain using the order details
    const orderListing2: ListingV1 = {
      brokerId,
      tokenAddress: STARKNET_NFT_ADDRESS,
      tokenId,
      startAmount: 600000000000000000
    };

    const orderHashListing2 = await createListing(config, {
      starknetAccount: starknetOffererAccount,
      arkAccount,
      order: orderListing2
    });
    expect(orderHashListing2).toBeDefined();

    await createOffer(config, {
      starknetAccount: starknetFulfillerAccount,
      arkAccount,
      offer: order
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await expect(
      getOrderStatus(config, { orderHash: orderHashListing2 }).then((res) =>
        shortString.decodeShortString(res.orderStatus)
      )
    ).resolves.toEqual("OPEN");

    // Create the offer on the arkchain using the order details
    const orderHash3 = await createOffer(config, {
      starknetAccount: starknetFulfillerAccount,
      arkAccount,
      offer: order
    });

    expect(orderHash3).toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Define the fulfill details
    const fulfillOfferInfo2 = {
      orderHash: orderHash3,
      tokenAddress: order.tokenAddress,
      tokenId: order.tokenId,
      brokerId
    };

    // Fulfill the offer
    await fulfillOffer(config, {
      starknetAccount: starknetOffererAccount,
      arkAccount,
      fulfillOfferInfo: fulfillOfferInfo2
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));
    const { orderStatus: orderStatusBetween2 } = await getOrderStatus(config, {
      orderHash: orderHash3
    });
    expect(shortString.decodeShortString(orderStatusBetween2)).toBe("FULFILLED");

    await new Promise((resolve) => setTimeout(resolve, 5000));
    const { orderStatus: orderStatusAfter2 } = await getOrderStatus(config, {
      orderHash: orderHash3
    });

    expect(shortString.decodeShortString(orderStatusAfter2)).toBe("EXECUTED");

    const orderHashListing3 = await createListing(config, {
      starknetAccount: starknetOffererAccount,
      arkAccount,
      order: orderListing1
    });
    expect(orderHashListing3).toBeDefined();

  }, 2000000);
/*
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
  it("should update balance of the owner", async function () {
    const { arkProvider, starknetProvider } = config;

    const starknetAdminAccount = await fetchOrCreateAccount(
      config.starknetProvider,
      process.env.SOLIS_ADMIN_ADDRESS_DEV,
      process.env.SOLIS_ADMIN_PRIVATE_KEY_DEV
    );

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

    // define fees
    await setBrokerFees(
      config,
      starknetAdminAccount,
      STARKNET_EXECUTOR_ADDRESS,
      brokerId,
      2
    );

    await setArkFees(
      config,
      starknetAdminAccount,
      STARKNET_EXECUTOR_ADDRESS,
      5
    );
    const balanceBefore = await getBalance(
      config,
      STARKNET_ETH_ADDRESS,
      starknetFulfillerAccount
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

    // check balances
    const balanceAfter = await getBalance(
      config,
      STARKNET_ETH_ADDRESS,
      starknetFulfillerAccount
    );
    // 5% ark fees + 2% broker fees + 1% creator (defined inside the contract)
    const fees = (BigInt(order.startAmount) * BigInt(8)) / BigInt(100);
    const amount = BigInt(order.startAmount) - fees;

    expect(balanceAfter).toEqual(balanceBefore + amount);
  }, 50000);*/
});
