import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { describe, expect, it } from "vitest";

import { createListing } from "@ark-project/core";
import { accounts, defaultConnector, mintERC721 } from "@ark-project/test";
import config from "@ark-project/test/src/config";
import { act, renderHook, waitFor } from "@ark-project/test/src/react";

import { useCreateListing } from "./useCreateListing";
import { useFulfillListing } from "./useFulfillListing";

function useCreateOfferWithConnect() {
  return {
    createListing: useCreateListing(),
    fulfillListing: useFulfillListing(),
    account: useAccount(),
    connect: useConnect(),
    disconnect: useDisconnect()
  };
}

describe("useFulfillListing", () => {
  it("default", async () => {
    const { seller, buyer, listingBroker, saleBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    // await mintERC20({ account: buyer, amount: 1000 });
    const { orderHash } = await createListing(config, {
      account: seller,
      brokerAddress: listingBroker.address,
      tokenAddress,
      tokenId,
      amount: BigInt(1000)
    });

    const { result } = renderHook(useCreateOfferWithConnect);

    await act(async () => {
      await result.current.connect.connectAsync({
        connector: defaultConnector
      });
    });

    await act(async () => {
      await result.current.fulfillListing.fulfillListingAsync({
        account: buyer,
        brokerAddress: saleBroker.address,
        orderHash,
        tokenAddress,
        tokenId,
        amount: BigInt(1000)
      });
    });

    await waitFor(() =>
      expect(result.current.fulfillListing.isSuccess).toBe(true)
    );

    await act(async () => {
      await result.current.disconnect.disconnectAsync();
    });
  }, 10_000);
});
