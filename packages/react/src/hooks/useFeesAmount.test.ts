import { describe, expect, it } from "vitest";

import { accounts, mintERC721 } from "@ark-project/test";
import { renderHook, waitFor } from "@ark-project/test/src/react";

import { useFeesAmount } from "./useFeesAmount";

describe("useFeesAmount", () => {
  it("default", async () => {
    const { seller, saleBroker, listingBroker } = accounts;
    const { tokenId, tokenAddress } = await mintERC721({ account: seller });

    const { result } = renderHook(() =>
      useFeesAmount({
        fulfillBroker: saleBroker.address,
        listingBroker: listingBroker.address,
        tokenAddress,
        tokenId,
        amount: BigInt(1000)
      })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchInlineSnapshot(`
      {
        "ark": 0n,
        "creator": 0n,
        "fulfillBroker": 0n,
        "listingBroker": 0n,
      }
    `);
  });
});
