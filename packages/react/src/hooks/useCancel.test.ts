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
    createOffer: useCreateOffer(),
    account: useAccount(),
    connect: useConnect(),
    disconnect: useDisconnect()
  };
}

describe("useCancelOffer", () => {
  it("default", async () => {
    const { seller } = accounts;
    const { result } = renderHook(() => useCreateOfferWithConnect());

    await act(async () => {
      await result.current.connect.connectAsync({
        connector: defaultConnector
      });
    });

    const buyer = result.current.account.account;

    expect(seller).toBeDefined();

    if (!buyer) {
      return;
    }

    await act(async () => {
      const { tokenId, tokenAddress } = await mintERC721({ account: seller });
      await mintERC20({ account: buyer, amount: 1000 });

      await result.current.createOffer.createOfferAsync({
        account: buyer,
        brokerAddress: accounts.listingBroker.address,
        tokenAddress,
        tokenId,
        amount: BigInt(1000)
      });
    });

    await waitFor(() =>
      expect(result.current.createOffer.isSuccess).toBe(true)
    );

    await act(async () => {
      await result.current.disconnect.disconnectAsync();
    });
  }, 50_000);
});
