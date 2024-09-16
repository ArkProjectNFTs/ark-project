import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { describe, expect, it } from "vitest";

import { accounts, defaultConnector, mintERC721 } from "@ark-project/test";
import { act, renderHook, waitFor } from "@ark-project/test/src/react";

import { useCreateAuction } from "./useCreateAuction";

function useCreateAuctionWithConnect() {
  return {
    mutation: useCreateAuction(),
    account: useAccount(),
    connect: useConnect(),
    disconnect: useDisconnect()
  };
}

describe("useCreateAuction", () => {
  it("default", async () => {
    const { result } = renderHook(() => useCreateAuctionWithConnect());

    await act(async () => {
      await result.current.connect.connectAsync({
        connector: defaultConnector
      });
    });

    await act(async () => {
      const seller = await defaultConnector.account();
      const { tokenId, tokenAddress } = await mintERC721({ account: seller });

      await result.current.mutation.createAuctionAsync({
        account: seller,
        brokerAddress: accounts.listingBroker.address,
        tokenAddress,
        tokenId,
        startAmount: BigInt(1000),
        endAmount: BigInt(2000)
      });
    });

    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    await act(async () => {
      await result.current.disconnect.disconnectAsync();
    });
  }, 20_000);
});
