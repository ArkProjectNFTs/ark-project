import { describe, expect, it } from "vitest";

import { renderHook, waitFor } from "../../test/react";
import { useDefaultCreatorFees } from "./useDefaultCreatorFees";

describe("useDefaultCreatorFees", () => {
  it("default", async () => {
    const { result } = renderHook(useDefaultCreatorFees);

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
