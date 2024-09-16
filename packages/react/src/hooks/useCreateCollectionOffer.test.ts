import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { describe, expect, it } from "vitest";

import {
  accounts,
  defaultConnector,
  mintERC20,
  mintERC721
} from "@ark-project/test";
import { act, renderHook, waitFor } from "@ark-project/test/src/react";

import useCreateCollectionOffer from "./useCreateCollectionOffer";

function useCreateCollectionOfferWithConnect() {
  return {
    mutation: useCreateCollectionOffer(),
    account: useAccount(),
    connect: useConnect(),
    disconnect: useDisconnect()
  };
}

describe("useCreateCollectionOffer", () => {
  it("default", async () => {
    const { seller } = accounts;
    const { result } = renderHook(() => useCreateCollectionOfferWithConnect());

    await act(async () => {
      await result.current.connect.connectAsync({
        connector: defaultConnector
      });
    });

    await act(async () => {
      const buyer = result.current.account.account;

      if (!buyer) {
        throw new Error("Account not connected");
      }

      const { tokenAddress } = await mintERC721({ account: seller });
      await mintERC20({ account: buyer, amount: 1000 });

      await result.current.mutation.createCollectionOfferAsync({
        account: buyer,
        brokerAddress: accounts.listingBroker.address,
        tokenAddress,
        amount: BigInt(1000)
      });
    });

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    await act(async () => {
      await result.current.disconnect.disconnectAsync();
    });
  }, 10_000);
});
