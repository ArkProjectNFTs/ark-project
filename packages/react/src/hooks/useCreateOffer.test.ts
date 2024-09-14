import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { describe, expect, it } from "vitest";

import {
  accounts,
  defaultConnector,
  mintERC20,
  mintERC721
} from "@ark-project/test";

import { act, renderHook, waitFor } from "../../../test/src/react";
import useCreateOffer from "./useCreateOffer";

function useCreateOfferWithConnect() {
  return {
    mutation: useCreateOffer(),
    account: useAccount(),
    connect: useConnect(),
    disconnect: useDisconnect()
  };
}

describe("useCreateOffer", () => {
  it("default", async () => {
    const { seller } = accounts;
    const { result } = renderHook(() => useCreateOfferWithConnect());

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

      const { tokenId, tokenAddress } = await mintERC721({ account: seller });
      await mintERC20({ account: buyer, amount: 1000 });

      await result.current.mutation.createOfferAsync({
        account: buyer,
        brokerAddress: accounts.listingBroker.address,
        tokenAddress,
        tokenId,
        amount: BigInt(1000)
      });
    });

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    await act(async () => {
      await result.current.disconnect.disconnectAsync();
    });
  }, 10_000);
});
