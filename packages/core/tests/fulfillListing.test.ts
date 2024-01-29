import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { RpcProvider, shortString } from "starknet";

import { createAccount } from "../src/actions/account/account";
import { createListing, fulfillListing } from "../src/actions/order";
import { getOrderHash, getOrderStatus } from "../src/actions/read";
import { ListingV1 } from "../src/types";
import { generateRandomTokenId, sleep } from "./utils";

chai.use(chaiAsPromised);

describe("ArkProject Listing", () => {
  it("should create and fulfill a listing", async () => {
    // Initialize the RPC provider with the ArkChain node URL
    const starknetProvider = new RpcProvider({
      nodeUrl: "http://0.0.0.0:7777"
    });

    // Initialize the RPC provider with the katana node URL for starknet
    const arkProvider = new RpcProvider({
      nodeUrl: "http://0.0.0.0:7777"
    });

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

    await createListing(arkProvider, starknetAccount, arkAccount, order);
    await sleep(2000);
    const { orderHash } = await getOrderHash(
      order.tokenId,
      order.tokenAddress,
      arkProvider
    );
    await expect(
      getOrderStatus(orderHash, arkProvider).then((res) =>
        shortString.decodeShortString(res.orderStatus)
      )
    ).to.eventually.equal("OPEN");

    // Create a new accounts for the fulfill using the provider
    const { account: starknetFulfillerAccount } =
      await createAccount(starknetProvider);

    const fulfill_info = {
      order_hash: orderHash,
      token_address: order.tokenAddress,
      token_id: order.tokenId
    };

    fulfillListing(
      arkProvider,
      starknetFulfillerAccount,
      arkAccount,
      fulfill_info
    );
    await sleep(1000);

    await expect(
      getOrderStatus(orderHash, arkProvider).then((res) =>
        shortString.decodeShortString(res.orderStatus)
      )
    ).to.eventually.equal("FULFILLED");
  });
});
