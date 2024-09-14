import { describe, expect, it } from "vitest";

import { accounts } from "@ark-project/test";

import { renderHook, waitFor } from "../../../test/src/react";
import { useBrokerFees } from "./useBrokerFees";

describe("useBrokerFees", () => {
  it("default", async () => {
    const { listingBroker } = accounts;

    const { result } = renderHook(() =>
      useBrokerFees({ brokerAdress: listingBroker.address })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchInlineSnapshot(`
    {
      "denominator": 1n,
      "formatted": "0.00",
      "numerator": 0n,
    }
  `);
  });
});
