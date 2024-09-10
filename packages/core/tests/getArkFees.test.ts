import { getArkFees } from "../src/index.js";
import { config } from "./utils/index.js";

describe("getArkFees", () => {
  it("default", async () => {
    const fees = await getArkFees(config);

    expect(fees).toMatchObject({
      formatted: expect.any(String),
      denominator: expect.any(BigInt),
      numerator: expect.any(BigInt)
    });
  }, 50_000);
});
