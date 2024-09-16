import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { describe, expect, it } from "vitest";

import { createAuction, createOffer } from "@ark-project/core";
import {
  accounts,
  defaultConnector,
  mintERC20,
  mintERC721
} from "@ark-project/test";
import config from "@ark-project/test/src/config";
import { act, renderHook, waitFor } from "@ark-project/test/src/react";

import { useFulfillAuction } from "./useFulfillAuction";

function useCreateAuctionWithConnect() {
  return {
    fulfillAuction: useFulfillAuction(),
    account: useAccount(),
    connect: useConnect(),
    disconnect: useDisconnect()
  };
}

describe("useFulfillAuction", () => {
  it("default", async () => {
    const { seller, buyer, listingBroker, saleBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });
    await mintERC20({ account: buyer, amount: 1000 });
    const { orderHash: relatedOrderHash } = await createAuction(config, {
      account: seller,
      brokerAddress: listingBroker.address,
      tokenAddress,
      tokenId,
      startAmount: BigInt(1000),
      endAmount: BigInt(2000)
    });
    const { orderHash } = await createOffer(config, {
      account: buyer,
      brokerAddress: listingBroker.address,
      tokenAddress,
      tokenId,
      amount: BigInt(1000)
    });

    const { result } = renderHook(useCreateAuctionWithConnect);

    await act(async () => {
      await result.current.connect.connectAsync({
        connector: defaultConnector
      });
    });

    await act(async () => {
      await result.current.fulfillAuction.fulfillAuctionAsync({
        account: seller,
        brokerAddress: saleBroker.address,
        orderHash: relatedOrderHash,
        relatedOrderHash: orderHash,
        tokenAddress,
        tokenId
      });
    });

    await waitFor(() =>
      expect(result.current.fulfillAuction.isSuccess).toBe(true)
    );

    await act(async () => {
      await result.current.disconnect.disconnectAsync();
    });
  }, 20_000);
});
