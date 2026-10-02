import { describe, expect, it } from "vitest";

import { createOffer } from "./createOffer";
import type { CreateOfferInput } from "./createOffer";

describe("createOffer", () => {
  it("should create an offer", async () => {
    const input: CreateOfferInput = {
      orderId: "order-1",
      price: 100n,
      quantity: 1n,
      marketplace: "ark",
      chain: "base",
    };

    const result = await createOffer(input);
    expect(result).toBeDefined();
  });
});
