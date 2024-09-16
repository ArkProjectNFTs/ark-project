import { describe, expect, it } from "vitest";

import { accounts, mintERC721 } from "@ark-project/test";
import { renderHook, waitFor } from "@ark-project/test/src/react";

import { useCollectionCreatorFees } from "./useCollectionCreatorFees";

describe("useCollectionCreatorFees", () => {
  it("default", async () => {
    const { seller } = accounts;
    const { tokenAddress } = await mintERC721({ account: seller });

    const { result } = renderHook(() =>
      useCollectionCreatorFees({ tokenAddress })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchInlineSnapshot(`
      {
        "creator": "0x6162896d1d7ab204c7ccac6dd5f8e9e7c25ecd5ae4fcb4ad32e57786bb46e03",
        "fees": {
          "denominator": 1n,
          "formatted": "0.00",
          "numerator": 0n,
        },
      }
    `);
  });
});
