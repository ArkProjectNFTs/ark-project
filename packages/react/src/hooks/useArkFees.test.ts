import { describe, expect, it } from "vitest";

import { renderHook, waitFor } from "../../test/react";
import { useArkFees } from "./useArkFees";

describe("useArkFees", () => {
  it("default", async () => {
    const { result } = renderHook(() => useArkFees());

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
