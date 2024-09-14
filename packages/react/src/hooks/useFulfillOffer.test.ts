import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { describe, expect, it } from "vitest";

import {
  accounts,
  defaultConnector,
  mintERC20,
  mintERC721
} from "@ark-project/test";
import { act, renderHook, waitFor } from "@ark-project/test/src/react";

import useCreateOffer from "./useCreateOffer";
import { useFulfillOffer } from "./useFulfillOffer";

function useCreateOfferWithConnect() {
  return {
    createOffer: useCreateOffer(),
    fulfillOffer: useFulfillOffer(),
    account: useAccount(),
    connect: useConnect(),
    disconnect: useDisconnect()
  };
}

describe("useFulfillOffer", () => {
  it("default", async () => {
    const { buyer, listingBroker, saleBroker } = accounts;
    const { result } = renderHook(useCreateOfferWithConnect);

    await act(async () => {
      await result.current.connect.connectAsync({
        connector: defaultConnector
      });
    });

    const seller = result.current.account.account;

    expect(seller).toBeDefined();

    if (!seller) {
      return;
    }

    await act(async () => {
      const { tokenId, tokenAddress } = await mintERC721({ account: seller });
      await mintERC20({ account: buyer, amount: 1000 });

      const { orderHash } = await result.current.createOffer.createOfferAsync({
        account: buyer,
        brokerAddress: listingBroker.address,
        tokenAddress,
        tokenId,
        amount: BigInt(1000)
      });

      await result.current.fulfillOffer.fulfillOfferAsync({
        account: seller,
        brokerAddress: saleBroker.address,
        orderHash,
        tokenAddress,
        tokenId
      });
    });

    await waitFor(() =>
      expect(result.current.fulfillOffer.isSuccess).toBe(true)
    );

    await act(async () => {
      await result.current.disconnect.disconnectAsync();
    });
  }, 10_000);
});
